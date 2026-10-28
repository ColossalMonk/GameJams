import * as THREE from 'three';
import { defineStory } from '../Story.js';
import { seg, smooth, easeOut, lerp, vec } from '../anim.js';
import { card, place } from '../../world/paper.js';
import { rect, roundRect, circle, poly } from '../../world/shapes.js';
import { makeOpenWindow, makeNote } from '../props/b-props.js';

const SHUTTERS = ['#2f6f6a', '#b5524a', '#3f6f8f', '#6d5a7a'];
const GLASS = '#cfe6f2';
const NOTES = 5;

/** Only the top half shows at a window; shrink the legs away so they don't count in the photo either. */
const hideLegs = (puppet) => {
  for (const leg of [puppet.legL, puppet.legR]) {
    leg.visible = false;
    leg.scale.setScalar(0.001);
  }
};

/** The shutters fly open and a singer finally lets out the high note. The glass, and the neighbours, react. */
export default defineStory({
  id: 'opera',
  slot: 'window',
  window: [4.0, 14.5],
  dur: 1.1,
  cast: { singer: { look: { top: '#9a6fb0' } }, neighbour: { old: true } },
  outcomes: {
    main: {
      tags: ['joy'],
      captions: {
        peak: '{singer}, holding the high note.',
        near: '{singer}, taking a big breath.',
        after: '{singer}, taking a bow.',
        idle: '{singer}, warming up behind the shutters.',
      },
    },
    crack: {
      tags: ['oops'],
      captions: {
        peak: "{singer}'s high note cracked the glass.",
        near: '{singer}, taking a big breath.',
        after: '{singer}, pretending nothing happened.',
        idle: '{singer}, warming up behind the shutters.',
      },
    },
    slam: {
      tags: ['oops'],
      captions: {
        peak: '{neighbour} has heard enough.',
        near: '{singer}, taking a big breath.',
        after: '{singer}, singing to closed shutters.',
        idle: '{singer}, warming up behind the shutters.',
      },
    },
  },
  create({ slot, person, group, evening, particles, outcome }) {
    const win = makeOpenWindow({ shutter: evening.pick(SHUTTERS) });
    win.group.position.set(slot.x, slot.y, slot.z);
    group.add(win.group);
    place(win.group, card(roundRect(-0.36, -0.44, 0.72, 0.32, 0.04), '#8a5a3e', { depth: 0.08 }), 0, 0, 0.28);
    for (const [fx, colour] of [[-0.22, '#f6a5b8'], [0, '#f2c14e'], [0.22, '#f6a5b8']]) place(win.group, card(circle(fx, -0.28, 0.06), colour, { depth: 0.01 }), 0, 0, 0.37);
    // Fanlight over the window: the glass that may not survive the note.
    const fan = new THREE.Group();
    win.group.add(fan);
    place(fan, card(rect(-0.34, 0.66, 0.68, 0.26), '#f2e8d6', { depth: 0.02 }), 0, 0, 0.02);
    const pane = place(fan, card(rect(-0.29, 0.7, 0.58, 0.18), GLASS, { depth: 0.01 }), 0, 0, 0.05);
    const cracks = new THREE.Group();
    for (const [cx, cy, a, l] of [[0.17, 0.8, 0.5, 0.14], [0.16, 0.81, 2.6, 0.17]]) {
      const c = place(cracks, card(rect(0, -0.006, l, 0.012), '#3a3340', { depth: 0.005, shadows: false }), cx, cy, 0.065);
      c.rotation.z = a;
    }
    cracks.visible = false;
    fan.add(cracks);
    const shards = [];
    for (let i = 0; i < 4; i++) {
      const s = card(poly([[0, 0], [0.12, 0.02], [0.04, 0.1]]), GLASS, { depth: 0.01, shadows: false });
      s.visible = false;
      group.add(s);
      shards.push({ s, x: -0.21 + i * 0.14, vx: (i - 1.5) * 0.3, spin: (i % 2 ? 1 : -1) * (4 + i) });
    }

    const height = 0.88;
    const singer = person('singer', slot.x, slot.y - 0.32 - 0.72 * height, slot.z - 0.25, 'R', { height });
    hideLegs(singer);
    const notes = Array.from({ length: NOTES }, (_, i) => {
      const n = makeNote(i % 2 ? '#2f2530' : '#b0453a');
      n.visible = false;
      group.add(n);
      return n;
    });

    // The neighbour upstairs, only on the evening the shutters slam.
    let upper = null;
    let neighbour = null;
    if (outcome === 'slam') {
      upper = makeOpenWindow({ shutter: evening.pick(SHUTTERS), h: 0.64, sill: 0.05, slats: 0 });
      upper.group.position.set(slot.x, slot.y + 0.95, slot.z);
      group.add(upper.group);
      neighbour = person('neighbour', slot.x, slot.y + 1.02 - 0.72 * 0.8, slot.z - 0.25, null, { height: 0.8 });
      hideLegs(neighbour);
    }

    const dur = 1.1;
    const mouth = vec();
    let shattered = false;
    let slammed = false;
    const singing = (t, o) => (t >= 0 && t < dur + (o === 'main' ? 0.2 : 0)) || (o === 'slam' && t > dur + 1.2 && t < dur + 3.5);

    return {
      focus: () => [singer.root, outcome === 'crack' ? fan : outcome === 'slam' ? upper.group : win.group],
      x: () => slot.x,
      update(p, { wall, outcome: o }) {
        win.shutters(p < -1.6 ? Math.abs(Math.sin(wall * 2)) * 0.03 : easeOut(seg(p, -1.6, -1.1)));
        const out = smooth(seg(p, -1.1, -0.7));
        singer.root.position.z = slot.z + lerp(-0.25, 0.14, out);
        singer.root.visible = p > -1.2;

        const breath = smooth(seg(p, -0.7, -0.05));
        const note = p >= 0 && p < dur + (o === 'main' ? 0.2 : 0);
        const vib = Math.sin(wall * 30) * 0.04;
        let lean = -0.1 * breath;
        if (note) {
          singer.pose({ armL: 1.9 + vib, armR: 1.9 - vib, head: vib * 0.5, mouth: 1.5, eyes: 0.15 });
          lean = 0.18;
        } else if (p < 0) {
          singer.pose({ armL: lerp(0.3, 1.0, breath), armR: lerp(0.3, 1.0, breath), mouth: 0.35 + 0.2 * breath, eyes: 1 - 0.5 * breath });
        } else if (o === 'main') {
          const bow = smooth(seg(p, dur + 0.3, dur + 0.7)) * (1 - smooth(seg(p, dur + 1.4, dur + 1.8)));
          lean = 0.55 * bow;
          singer.pose({ armL: lerp(1.9, 0.6, bow), armR: p > dur + 1.8 ? 2.4 + Math.sin(wall * 9) * 0.3 : lerp(1.9, 0.6, bow), mouth: 0.6, eyes: bow > 0.5 ? 0.2 : 1 });
        } else if (o === 'crack') {
          const shock = p < dur + 0.9;
          singer.pose({ armL: shock ? 2.75 : 0.35, armR: shock ? 2.75 : 0.35, head: shock ? 0.1 : Math.sin(wall * 2.5) * 0.15, mouth: shock ? 1 : 0.2, eyes: shock ? 1 : 0.4 });
        } else {
          const again = singing(p, o);
          singer.pose({ armL: again ? 1.2 + vib : 0.4, armR: again ? 1.2 - vib : 0.4, head: again ? 0 : 0.2, mouth: again ? 0.9 : 0.3, eyes: again ? 0.3 : 1 });
        }
        singer.hips.rotation.x = lean;
        singer.root.updateMatrixWorld(true);
        singer.head.localToWorld(mouth.set(0, singer.headCentre.y - 0.08, 0.12));

        // Paper notes drift out of the window while the note lasts.
        notes.forEach((n, j) => {
          const k = j + NOTES * Math.floor((p / 0.18 - j) / NOTES);
          const start = k * 0.18;
          const age = p - start;
          n.visible = k >= 0 && age >= 0 && age < 1.3 && singing(start, o);
          if (!n.visible) return;
          const side = k % 2 ? 1 : -1;
          n.position.set(mouth.x + side * (0.35 + 0.15 * (k % 3)) * age * 1.6, mouth.y + 0.1 + 0.9 * age + Math.sin(age * 7 + k) * 0.06, mouth.z + 0.1);
          n.rotation.z = Math.sin(age * 5 + k) * 0.3;
          n.scale.setScalar(Math.min(1, age * 6) * (1 - smooth(seg(age, 0.9, 1.3))) * 1.2);
        });

        if (o === 'crack') {
          cracks.visible = p > 0.15;
          pane.visible = p < 0.45;
          if (p >= 0.45 && !shattered) {
            shattered = true;
            for (const sh of shards) sh.s.visible = true;
          }
          for (const sh of shards) {
            if (!sh.s.visible) continue;
            const t = p - 0.45;
            const y = slot.y + 0.76 - 4.9 * t * t;
            sh.s.position.set(slot.x + sh.x + sh.vx * t, y, slot.z + 0.4);
            sh.s.rotation.z = sh.spin * t;
            if (y < 0.1) sh.s.visible = false;
          }
        }

        if (o === 'slam') {
          const opened = easeOut(seg(p, -0.9, -0.6));
          const shut = seg(p, 0.1, 0.26);
          upper.shutters(shut < 1 ? opened * (1 - shut * shut) : Math.abs(Math.sin(Math.PI * seg(p, 0.26, 0.5))) * 0.05);
          const look = smooth(seg(p, -0.7, -0.4)) * (1 - smooth(seg(p, 0.02, 0.12)));
          neighbour.root.position.z = slot.z + lerp(-0.25, 0.14, look);
          neighbour.root.visible = look > 0.01;
          neighbour.pose({ armL: 0.3, armR: p < 0 ? 0.3 : 1.6, head: -0.1, mouth: p < 0 ? 0.12 : 0.9, eyes: 0.55 });
          if (p >= 0.26 && !slammed) {
            slammed = true;
            for (const s of [-1, 1]) particles.spawn('puff', vec(slot.x + s * 0.3, slot.y + 1.3, slot.z + 0.4), new THREE.Vector3(s * 0.9, 0.2, 0.1), { life: 0.9, scale: 0.6 });
          }
        }
      },
    };
  },
});
