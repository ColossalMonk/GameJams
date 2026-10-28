/**
 * Every story the director can choose from. Add a story by writing a file in
 * catalogue/ and importing it here.
 */
import cat from './catalogue/cat.js';
import kite from './catalogue/kite.js';
import frisbee from './catalogue/frisbee.js';
import musician from './catalogue/musician.js';
import birthday from './catalogue/birthday.js';
import oldCar from './catalogue/oldCar.js';
import wedding from './catalogue/wedding.js';
import proposal from './catalogue/proposal.js';
import rooftopKiss from './catalogue/rooftopKiss.js';
import balloon from './catalogue/balloon.js';
import paperPlane from './catalogue/paperPlane.js';
import fireworks from './catalogue/fireworks.js';
import batchA from './catalogue/index-a.js';
import batchB from './catalogue/index-b.js';
import batchC from './catalogue/index-c.js';

export const STORIES = [
  cat,
  kite,
  frisbee,
  musician,
  birthday,
  oldCar,
  wedding,
  proposal,
  rooftopKiss,
  balloon,
  paperPlane,
  fireworks,
  ...batchA,
  ...batchB,
  ...batchC,
];

const ids = new Set();
for (const s of STORIES) {
  if (ids.has(s.id)) throw new Error(`duplicate story id "${s.id}"`);
  ids.add(s.id);
}

/** Stories that need a building site (the facades then make room for one). */
export const usesSite = (plan) => plan.some((item) => item.story.slots.includes('site'));
