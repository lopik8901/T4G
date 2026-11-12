import {StringDecoder} from 'node:string_decoder'

// A supported scene can contain four bounded SVG definitions and 48 entities.
// The old 64 KB cap rejected valid current-game metadata during an edit.
export const maxRequestBytes=1024*1024
export class RequestBodyTooLarge extends Error{}
export async function readRequestBody(chunks:AsyncIterable<Uint8Array>,limit=maxRequestBytes){
  const decoder=new StringDecoder('utf8');let bytes=0,body=''
  for await(const chunk of chunks){
    bytes+=chunk.byteLength
    if(bytes>limit)throw new RequestBodyTooLarge('Request is too large. The maximum is 1 MiB.')
    body+=decoder.write(Buffer.from(chunk))
  }
  return body+decoder.end()
}
