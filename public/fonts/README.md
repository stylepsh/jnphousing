# Noto Sans KR

서버 사이드 PDF 생성용으로 번들한다(런타임에 외부 CDN을 타지 않게).

**정적 인스턴스만 둔다.** 예전에는 가변 폰트 `NotoSansKR-Variable.ttf` 하나만
두고 normal·bold 를 같은 파일로 등록했는데, `@react-pdf/renderer` 는 가변축을
지원하지 않아 기본 인스턴스인 **Thin(wght 100)** 으로 렌더됐다. 모든 PDF 가
얇게 나와 인쇄하면 흐릿했고 굵기 구분도 없었다.

- Source: https://github.com/google/fonts/tree/main/ofl/notosanskr
- Source commit: `e201719944904d2b21cd158f724c2e5889c6e19a`
- 원본 가변 폰트 SHA-256: `194018E6B2B293A7964F037B25C0249CE1418BC9AB3C971060A03AA57861E252`
- License: SIL Open Font License 1.1 (`OFL-NotoSansKR.txt`)

재생성 방법 (원본 가변 TTF 를 위 커밋에서 받은 뒤):

```bash
pip install fonttools
python -m fontTools.varLib.instancer NotoSansKR-Variable.ttf wght=400 -o NotoSansKR-Regular.ttf
python -m fontTools.varLib.instancer NotoSansKR-Variable.ttf wght=700 -o NotoSansKR-Bold.ttf
```

인스턴서는 이름표를 원본 기본 인스턴스("Noto Sans KR Thin")로 남긴다. 두 파일의
이름이 같으면 @react-pdf 가 같은 폰트로 보고 bold 를 무시하므로, name 테이블을
Regular/Bold 로 고쳐야 한다(fsSelection·macStyle 굵기 비트 포함).

- `NotoSansKR-Regular.ttf` SHA-256: `DEA19E2551EAE24661AF32B0B9985C50612ABC53DF46491B409FC0FB41BD888B`
- `NotoSansKR-Bold.ttf` SHA-256: `71628FCAAF434719D14318AE27A83E7457109E225EE3BA678A93BF656715649E`
