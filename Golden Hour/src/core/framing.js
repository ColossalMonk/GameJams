import * as THREE from 'three';
import { VIEW_BOX } from '../config.js';

/**
 * Where the fixed theatre camera sits so all of VIEW_BOX is visible at the camera's
 * aspect. Any spare height goes to the sky rather than the pavement. Fills target and
 * position and updates the projection. Shared with the headless self-test.
 */
export function fitCamera(camera, target, position) {
  const halfW = (VIEW_BOX.right - VIEW_BOX.left) / 2;
  const halfH = (VIEW_BOX.top - VIEW_BOX.bottom) / 2;
  const cx = (VIEW_BOX.right + VIEW_BOX.left) / 2;
  const vTan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const hTan = vTan * camera.aspect;
  const d = Math.max(halfW / hTan, halfH / vTan);
  target.set(cx, VIEW_BOX.bottom + d * vTan, 0);
  position.set(cx, target.y + d * 0.07, d);
  camera.updateProjectionMatrix();
}
