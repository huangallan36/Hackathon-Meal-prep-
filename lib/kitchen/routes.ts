/**
 * Kitchen screen URLs. /ai/fridge picks its step from the query:
 *   ?scan=1  camera step (fresh scan), even when ingredients are already stored
 *   ?edit=1  ingredient chips, even during a voice session
 *   (none)   chips when ingredients exist, camera otherwise; during a voice session the
 *            camera, because the only voice action that opens it is open_fridge_camera
 */
export const FRIDGE_SCAN_HREF = "/ai/fridge?scan=1";
export const FRIDGE_EDIT_HREF = "/ai/fridge?edit=1";
export const RECIPES_HREF = "/ai/recipes";

export const cookHref = (id: number) => `/ai/cook/${id}`;
export const groceriesHref = (id: number) => `/ai/groceries/${id}`;
