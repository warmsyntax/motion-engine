/// Decomposes a CSS transform matrix string (matrix or matrix3d) into translation, scale, skew, and rotation.
/// Follows the W3C CSS Transforms Module specification (Unmatrix algorithm).
export function decomposeMatrix(matrixStr) {
  const cleanStr = matrixStr ? matrixStr.trim() : '';

  const defaultDecomp = {
    translate: [0.0, 0.0, 0.0],
    scale: [1.0, 1.0, 1.0],
    skew: [0.0, 0.0, 0.0],
    rotate: [0.0, 0.0, 0.0],
    perspective: [0.0, 0.0, 0.0, 1.0]
  };

  if (cleanStr === 'none' || !cleanStr) {
    return defaultDecomp;
  }

  // 2D Matrix regex
  const reMatrix = /^matrix\(([^)]+)\)$/;
  // 3D Matrix regex
  const reMatrix3D = /^matrix3d\(([^)]+)\)$/;

  let match;
  if ((match = cleanStr.match(reMatrix))) {
    const vals = match[1].split(',').map(s => parseFloat(s.trim()) || 0.0);
    if (vals.length < 6) return defaultDecomp;

    const [a, b, c, d, e, f] = vals;
    
    const translate = [e, f, 0.0];
    const scaleX = Math.sqrt(a * a + b * b);
    const scaleY = Math.sqrt(c * c + d * d);
    const scale = [scaleX, scaleY, 1.0];

    const rotateZ = Math.atan2(b, a) * (180 / Math.PI);
    const rotate = [0.0, 0.0, rotateZ];

    const skewVal = scaleX > 0 && scaleY > 0 ? (a * c + b * d) / (scaleX * scaleY) : 0.0;
    const skew = [skewVal, 0.0, 0.0];

    return {
      translate,
      scale,
      skew,
      rotate,
      perspective: [0.0, 0.0, 0.0, 1.0]
    };
  } else if ((match = cleanStr.match(reMatrix3D))) {
    const vals = match[1].split(',').map(s => parseFloat(s.trim()) || 0.0);
    if (vals.length < 16) return defaultDecomp;

    const translate = [vals[12], vals[13], vals[14]];

    let row = [
      [vals[0], vals[1], vals[2]],
      [vals[4], vals[5], vals[6]],
      [vals[8], vals[9], vals[10]]
    ];

    const scale = [0.0, 0.0, 0.0];
    const skew = [0.0, 0.0, 0.0]; // xy, xz, yz

    const len3D = v => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    const normalize3D = v => {
      const l = len3D(v);
      if (l > 0) {
        v[0] /= l;
        v[1] /= l;
        v[2] /= l;
      }
    };
    const dot3D = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

    // Compute X scale and normalize row 0
    scale[0] = len3D(row[0]);
    if (scale[0] > 0.0) normalize3D(row[0]);

    // Compute XY skew and orthogonalize row 1
    skew[0] = dot3D(row[0], row[1]);
    row[1][0] -= skew[0] * row[0][0];
    row[1][1] -= skew[0] * row[0][1];
    row[1][2] -= skew[0] * row[0][2];

    // Compute Y scale and normalize row 1
    scale[1] = len3D(row[1]);
    if (scale[1] > 0.0) {
      normalize3D(row[1]);
      skew[0] /= scale[1];
    }

    // Compute XZ and YZ skews, orthogonalize row 2
    skew[1] = dot3D(row[0], row[2]);
    row[2][0] -= skew[1] * row[0][0];
    row[2][1] -= skew[1] * row[0][1];
    row[2][2] -= skew[1] * row[0][2];

    skew[2] = dot3D(row[1], row[2]);
    row[2][0] -= skew[2] * row[1][0];
    row[2][1] -= skew[2] * row[1][1];
    row[2][2] -= skew[2] * row[1][2];

    // Compute Z scale and normalize row 2
    scale[2] = len3D(row[2]);
    if (scale[2] > 0.0) {
      normalize3D(row[2]);
      skew[1] /= scale[2];
      skew[2] /= scale[2];
    }

    // Extract Euler angles (XYZ rotation order)
    const rotateY = Math.asin(Math.max(-1.0, Math.min(1.0, -row[0][2])));
    let rotateX, rotateZ;

    if (Math.abs(Math.cos(rotateY)) > 1e-6) {
      rotateX = Math.atan2(row[1][2], row[2][2]);
      rotateZ = Math.atan2(row[0][1], row[0][0]);
    } else {
      rotateX = Math.atan2(-row[2][1], row[1][1]);
      rotateZ = 0.0;
    }

    const radToDeg = r => r * (180 / Math.PI);
    const rotate = [radToDeg(rotateX), radToDeg(rotateY), radToDeg(rotateZ)];

    return {
      translate,
      scale,
      skew,
      rotate,
      perspective: [vals[3], vals[7], vals[11], vals[15]]
    };
  }

  return defaultDecomp;
}
