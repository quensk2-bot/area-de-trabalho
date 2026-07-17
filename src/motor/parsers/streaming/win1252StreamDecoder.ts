import iconv from "iconv-lite";

/** Decoder incremental Windows-1252 via iconv-lite (Transform nativo). */
export function createWin1252DecoderStream(): NodeJS.ReadWriteStream {
  return iconv.decodeStream("win1252");
}
