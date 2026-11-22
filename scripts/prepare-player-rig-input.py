#!/usr/bin/env python3
"""Remove only large, nearly planar ground/base islands from a single-mesh GLB.

The source is a glTF 2.0 binary. Original material/image bufferViews are retained;
replacement geometry accessors are appended to the binary chunk.
"""
import argparse, json, math, struct
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

def read_glb(path):
    data = Path(path).read_bytes()
    if data[:4] != b"glTF":
        raise ValueError("Expected binary GLB")
    version, total = struct.unpack_from("<II", data, 4)
    if version != 2 or total != len(data):
        raise ValueError("Invalid GLB header")
    jlen, jtype = struct.unpack_from("<II", data, 12)
    if jtype != 0x4E4F534A:
        raise ValueError("Missing JSON chunk")
    doc = json.loads(data[20:20+jlen].decode("utf-8"))
    boff = 20 + jlen
    blen, btype = struct.unpack_from("<II", data, boff)
    if btype != 0x004E4942:
        raise ValueError("Missing BIN chunk")
    return doc, bytearray(data[boff+8:boff+8+blen])

def accessor_array(doc, blob, index):
    a = doc["accessors"][index]
    if "sparse" in a:
        raise ValueError("Sparse accessors are not supported by this diagnostic")
    view = doc["bufferViews"][a["bufferView"]]
    comp = {5121:"u1", 5123:"<u2", 5125:"<u4", 5126:"<f4"}[a["componentType"]]
    width = {"SCALAR":1,"VEC2":2,"VEC3":3,"VEC4":4}[a["type"]]
    offset = view.get("byteOffset",0) + a.get("byteOffset",0)
    stride = view.get("byteStride", width*np.dtype(comp).itemsize)
    if stride != width*np.dtype(comp).itemsize:
        raise ValueError("Interleaved accessors are not supported")
    return np.ndarray((a["count"],width), dtype=comp, buffer=blob, offset=offset).copy()

def append_accessor(doc, blob, old_index, values, component_type, kind):
    while len(blob) % 4: blob.append(0)
    offset = len(blob)
    raw = np.ascontiguousarray(values).tobytes()
    blob.extend(raw)
    view_index = len(doc["bufferViews"])
    doc["bufferViews"].append({"buffer":0,"byteOffset":offset,"byteLength":len(raw)})
    a = doc["accessors"][old_index]
    a["bufferView"] = view_index
    a["byteOffset"] = 0
    a["count"] = int(len(values))
    a.pop("sparse", None)
    if kind == "SCALAR":
        a["min"] = [int(np.min(values))] if len(values) else [0]
        a["max"] = [int(np.max(values))] if len(values) else [0]
    else:
        a["min"] = np.min(values,axis=0).astype(float).tolist()
        a["max"] = np.max(values,axis=0).astype(float).tolist()

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("source"); ap.add_argument("output"); ap.add_argument("--report",required=True)
    args=ap.parse_args()
    doc, blob=read_glb(args.source)
    meshes=doc.get("meshes",[])
    if len(meshes)!=1 or len(meshes[0].get("primitives",[]))!=1:
        raise ValueError("Expected one mesh with one primitive")
    prim=meshes[0]["primitives"][0]
    if prim.get("mode",4)!=4:
        raise ValueError("Expected triangle primitives")
    attrs=prim["attributes"]
    pos=accessor_array(doc,blob,attrs["POSITION"]).astype(np.float32)
    uv=accessor_array(doc,blob,attrs["TEXCOORD_0"]).astype(np.float32) if "TEXCOORD_0" in attrs else None
    normals=accessor_array(doc,blob,attrs["NORMAL"]).astype(np.float32) if "NORMAL" in attrs else None
    idx=accessor_array(doc,blob,prim["indices"]).reshape(-1).astype(np.int64)
    if len(idx)%3: raise ValueError("Index count is not divisible by three")
    faces=idx.reshape(-1,3)
    # Connected components over indexed triangle edges (not proximity guesses).
    edges=np.vstack((faces[:,[0,1]],faces[:,[1,2]],faces[:,[2,0]]))
    rows=np.concatenate((edges[:,0],edges[:,1])); cols=np.concatenate((edges[:,1],edges[:,0]))
    graph=coo_matrix((np.ones(len(rows),dtype=np.uint8),(rows,cols)),shape=(len(pos),len(pos))).tocsr()
    count, labels=connected_components(graph,directed=False,return_labels=True)
    sizes=np.bincount(labels,minlength=count)
    mins=np.full((count,3),np.inf); maxs=np.full((count,3),-np.inf)
    np.minimum.at(mins,labels,pos); np.maximum.at(maxs,labels,pos)
    spans=maxs-mins
    overall_height=float(np.ptp(pos[:,1]))
    floor_band=max(0.008,overall_height*0.01)
    global_floor=float(np.min(pos[:,1]))
    horizontal_area=spans[:,0]*spans[:,2]
    # Remove only broad, almost perfectly flat islands at the very bottom.
    candidates=(sizes>=500)&(spans[:,1]<=floor_band)&(mins[:,1]<=global_floor+floor_band*2)&(horizontal_area>=overall_height**2*0.08)
    face_labels=labels[faces[:,0]]
    remove_face=candidates[face_labels]
    keep_faces=faces[~remove_face]
    if not np.any(remove_face):
        raise ValueError("No confident flat-base components found; refusing to alter the model")
    used=np.unique(keep_faces.reshape(-1))
    remap=np.full(len(pos),-1,dtype=np.int64); remap[used]=np.arange(len(used),dtype=np.int64)
    new_faces=remap[keep_faces].astype("<u4").reshape(-1)
    old_index=prim["indices"]
    append_accessor(doc,blob,old_index,new_faces,5125,"SCALAR")
    append_accessor(doc,blob,attrs["POSITION"],pos[used],5126,"VEC3")
    if uv is not None: append_accessor(doc,blob,attrs["TEXCOORD_0"],uv[used],5126,"VEC2")
    if normals is not None: append_accessor(doc,blob,attrs["NORMAL"],normals[used],5126,"VEC3")
    doc["buffers"][0]["byteLength"]=len(blob)
    report={
      "source_vertices":int(len(pos)),"source_triangles":int(len(faces)),
      "connected_components":int(count),"removed_components":[int(x) for x in np.where(candidates)[0]],
      "removed_component_vertices":int(sizes[candidates].sum()),
      "removed_triangles":int(remove_face.sum()),
      "output_vertices":int(len(used)),"output_triangles":int(len(keep_faces)),
      "floor_band":floor_band,"floor_y":global_floor,
      "removed_bounds":[{"min":mins[i].tolist(),"max":maxs[i].tolist(),"vertices":int(sizes[i])} for i in np.where(candidates)[0]],
      "decision":"removed only large flat bottom islands; all other geometry retained"
    }
    Path(args.report).write_text(json.dumps(report,indent=2))
    jbytes=json.dumps(doc,separators=(",",":"),ensure_ascii=False).encode("utf-8")
    jbytes+=b" "*((4-len(jbytes)%4)%4)
    while len(blob)%4: blob.append(0)
    out=b"glTF"+struct.pack("<II",2,12+8+len(jbytes)+8+len(blob))
    out+=struct.pack("<II",len(jbytes),0x4E4F534A)+jbytes
    out+=struct.pack("<II",len(blob),0x004E4942)+blob
    Path(args.output).write_bytes(out)
    print(json.dumps(report))
if __name__=="__main__": main()
