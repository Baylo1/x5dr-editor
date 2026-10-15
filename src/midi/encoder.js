// SysEx encoder — encodes Snapshot objects back to .syx binary format.
import { pack7bit, packedLength, sysexHeader, encodeProgramToBytes, encodeCombiToBytes, encodeMultiEffectsToBytes, encodeGlobalToBytes as encodeGlobalToBytesRaw, encodeDrumsToBytes as encodeDrumsToBytesRaw } from './sysex.js';

// All Data's Global and Drums blocks write zeros when nothing has been loaded
// yet — the shared sysex.js encoders assume real data, so that null fallback
// stays local to this "assemble a full snapshot" context.
function encodeGlobalToBytes(g) {
  return g == null ? new Uint8Array(28) : encodeGlobalToBytesRaw(g);
}

function encodeDrumsToBytes(kits) {
  return kits == null ? new Uint8Array(840) : encodeDrumsToBytesRaw(kits);
}

function encodeCombisToBytes(combis) {
  const b = new Uint8Array(13600); // 100 x 136
  if (combis) {
    for (let i = 0; i < 100; i++) {
      if (i < combis.length && combis[i] != null) {
        b.set(encodeCombiToBytes(combis[i]), i * 136);
      }
    }
  }
  return b;
}

/**
 * Encode a Snapshot's combis to a Func=4D All Combination SysEx binary (.syx).
 * @param {Object} snapshot  workingCopy snapshot from store.getSnapshot()
 * @returns {Uint8Array}     Complete SysEx message including F0 header and F7 footer
 */
export function combisToSyx(snapshot) {
  return assembleSyx(0x4D, encodeCombisToBytes(snapshot.combis));
}

function encodeProgramsToBytes(programs) {
  const b = new Uint8Array(16400);
  if (programs) {
    for (let i = 0; i < 100; i++) {
      if (i < programs.length && programs[i] != null) {
        b.set(encodeProgramToBytes(programs[i]), i * 164);
      }
    }
  }
  return b;
}

// Wraps a raw (unpacked) payload in the SysEx header/footer for funcCode, with
// the standard 0x00 padding byte (Func=4C and Func=50 both take one).
function assembleSyx(funcCode, raw) {
  const packed = pack7bit(raw).slice(0, packedLength(raw.length));
  const header = [...sysexHeader(), funcCode, 0x00];
  const result = new Uint8Array(header.length + packed.length + 1);
  result.set(header);
  result.set(packed, header.length);
  result[result.length - 1] = 0xF7;
  return result;
}

/**
 * Encode a Snapshot's programs to a Func=4C All Programs SysEx binary (.syx).
 * @param {Object} snapshot  workingCopy snapshot from store.getSnapshot()
 * @returns {Uint8Array}     Complete SysEx message including F0 header and F7 footer
 */
export function programsToSyx(snapshot) {
  return assembleSyx(0x4C, encodeProgramsToBytes(snapshot.programs));
}

/**
 * Encode a full Snapshot to a Func=50 All Data SysEx binary (.syx).
 * @param {Object} snapshot  workingCopy snapshot from store.getSnapshot()
 * @returns {Uint8Array}     Complete SysEx message including F0 header and F7 footer
 */
export function snapshotToSyx(snapshot) {
  const globalBytes = encodeGlobalToBytes(snapshot.global);
  const drumsBytes = encodeDrumsToBytes(snapshot.drums);

  const combisBytes = encodeCombisToBytes(snapshot.combis);

  const progsBytes = encodeProgramsToBytes(snapshot.programs);

  // Multi: 29 bytes — All Data only carries the Effects block (NOTE 10), never
  // the 208-byte expansion; write zeros if no Multi Effects have been loaded yet.
  const multiBytes = snapshot.multi?.effects != null
    ? encodeMultiEffectsToBytes(snapshot.multi.effects)
    : new Uint8Array(29);

  // Assemble raw payload: global + drums + combis + programs + multi
  const totalRaw = 28 + 840 + 13600 + 16400 + 29;
  const raw = new Uint8Array(totalRaw);
  let offset = 0;
  raw.set(globalBytes, offset); offset += 28;
  raw.set(drumsBytes, offset);  offset += 840;
  raw.set(combisBytes, offset); offset += 13600;
  raw.set(progsBytes, offset);  offset += 16400;
  raw.set(multiBytes, offset);

  return assembleSyx(0x50, raw);
}
