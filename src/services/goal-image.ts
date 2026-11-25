import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { GOAL_IMAGE_PREFIX, GOAL_IMAGE_SIZE, isValidGoalImage } from '@/utils/goal-image';

/**
 * Lets the user pick a photo for a goal, then crops it square and shrinks it
 * to a small JPEG data URI that's stored with the goal (see utils/goal-image.ts).
 * Returns null if they cancel. Works on phones and web; on web it must be
 * called straight from a tap.
 *
 * iOS and Android's photo pickers don't need a permission prompt for this.
 */
export async function pickGoalImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;

  const context = ImageManipulator.manipulate(asset.uri);
  // The picker's own crop isn't available everywhere (e.g. web), so square it here.
  const side = Math.min(asset.width, asset.height);
  if (side > 0 && asset.width !== asset.height) {
    context.crop({
      originX: Math.floor((asset.width - side) / 2),
      originY: Math.floor((asset.height - side) / 2),
      width: side,
      height: side,
    });
  }
  context.resize({ width: GOAL_IMAGE_SIZE, height: GOAL_IMAGE_SIZE });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
  const uri = saved.base64 ? GOAL_IMAGE_PREFIX + saved.base64 : null;
  if (uri && isValidGoalImage(uri)) return uri;
  // Still too big (a very detailed photo): try once more, smaller and more compressed.
  const smaller = await (await ImageManipulator.manipulate(saved.uri).resize({ width: 240, height: 240 }).renderAsync())
    .saveAsync({ format: SaveFormat.JPEG, compress: 0.45, base64: true });
  const retry = smaller.base64 ? GOAL_IMAGE_PREFIX + smaller.base64 : null;
  return retry && isValidGoalImage(retry) ? retry : null;
}
