import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// RN(Metro) 번들러는 확장자 없는 import('../utils/geo')를 해석하지만 node ESM은 못 한다.
// 소스를 테스트 편의로 바꾸지 않기 위해, 테스트 실행 시에만 .js를 이어준다.
// 실제로 그 .js가 있을 때만 개입한다 — 아니면 원래 에러를 그대로 던져야
// 디렉터리 인자 같은 무관한 해석까지 삼키지 않는다.
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (err) {
    if (/^(\.|file:)/.test(specifier) && !/\.[a-z]+$/i.test(specifier)) {
      try {
        const candidate = new URL(specifier + '.js', context.parentURL);
        if (existsSync(fileURLToPath(candidate))) {
          return await next(specifier + '.js', context);
        }
      } catch {
        // URL 구성 실패 시 원래 에러를 던진다
      }
    }
    throw err;
  }
}
