---
layout: post
title: Java 문자열 인코딩
date: 2024-11-03 16:00:00 + 0900
categories: Java
ref: encoding
---

### 강의 : [김영한의 실전 자바 - 고급 2편, I/O, 네트워크, 리플렉션](https://www.inflearn.com/course/%EA%B9%80%EC%98%81%ED%95%9C%EC%9D%98-%EC%8B%A4%EC%A0%84-%EC%9E%90%EB%B0%94-%EA%B3%A0%EA%B8%89-2/dashboard)

# 1.문자 인코딩

## 1-1. 컴퓨터와 데이터
개발자가 개발하며 다루는 데이터는 주로 "ABC"와 같은 문자 이지만, 컴퓨터는 데이터를 "010101"로 되어 있는 바이너리로 저장한다.   
바이너리 데이터로 문자를 표현하기 위해 "A:65, B:66, a:97..." 같은 문자 집합을 사용한다.   
우리가 문자 'A'를 저장하면, 컴퓨터는 문자 집합을 통해 'A'의 숫자 값 65를 찾고 메모리에 65로 저장한다.   
반대로 메모리에 저장된 문자를 불러 올 때는, 65를 문자 집합을 통해 'A'로 변환해서 출력한다.    
문자 집합을 통해 문자를 숫자로 변환하는 것을 **문자 인코딩**, 문자 집합을 통해 숫자를 문자로 변환하는 것을 **문자 디코딩** 이라고 한다.   

## 1-2. 문자 집합

### 1-2-1. ASCII 문자 집합
문자 집합의 호환성을 위해 ASCII(American Standard Code for Information Interchange)라는 표준 문자 집합이 1960년도에 개발되었다.   
영문 알파벳, 숫자, 키보드의 특수문자, 스페이스, 엔터와 같은 기본적인 문자만 표현하면 충분해 7비트를 사용해 총 128가지 문자를 표현할 수 있었다.   

### 1-2-2. ISO_8859_1
1980년도에 개발된 서유럽 문자를 표현하는 문자 집합이고 ISO_8859_1, LATIN1, ISO-LATIN-1 등으로 불린다.    
8bit 문자 집합으로 총 256가지 문자를 표현할 수 있다. 호환성을 위해 기존 7비트(0-127)를 그대로 유지해 ASCII와 호환 가능하다.    

### 1-2-3. EUC-KR
1980년도에 등장한 한글 문자 집합.모든 한글을 담진 않고 자주 사용하는 한글 2350개만 포함해서 만들었다.   
ASCII + 자주 사용하는 한글 2350개 + 한국에서 자주 사용하는 기타 글자(한자 4,888개, 일본어 가타카나 등)으로 구성되어 있다.   
기존 ASCII 문자 집합과 호환 가능하고 영어를 사용하면 1byte, 한글을 사용하면 2byte를 메모리에 저장한다.   

### 1-2-4. MS949
마이크로소프트가 EUC-KR을 확장해 만든 문자 집합이다. 1990년도에 등장했고 표현 가능한 한글의 수는 총 11,172자 이다.   
ASCII 문자 집합과 호환 가능하고 EUC-KR과 마찬가지로 ASCII는 1byte, 한글은 2byte를 사용한다.    
윈도우 시스템에서 계속 사용한다.   


### 1-2-5. 유니코드
전세계 문자를 대부분 다 표현할 수 있는 문자 집합이다. UTF-8과 UTF-16이 있다.   
**UTF-16**은 영어를 포함한 주요 언어들을 2byte로 표현한다. 그래서 ASCII 영문도 2byte를 사용하고 ASCII와 호환되지 않는다.   
웹에 있는 문서의 80% 이상이 영문 문서 인데, UTF-16을 사용하면 영문의 경우 다른 문자 집합보다 2배의 메모리를 더 사용해야 한다.   
<br/>
**UTF-8**은 8bit 기반 가변길이 인코딩이다. 1~4byte를 사용해서 문자를 인코딩 한다.   
ASCII, 영문은 1byte, 그리스 히브리어는 2byte, 한글 한자 일본어는 3byte, 이모지와 고대문자 등은 4byte를 사용한다.   
ASCII와 호환 가능하고 대부분의 문자를 표현할 수 있어 현대의 사실상 표준 인코딩 기술이다.   

## 1-3. 문자 인코딩 예제1

```java
public class EncodingMain2 {

    private static final Charset EUC_KR = Charset.forName("EUC-KR");
    private static final Charset MS_949 = Charset.forName("MS949");

    public static void main(String[] args) {
        System.out.println("== 영문 ASCII 인코딩 ==");
        test("A", US_ASCII, US_ASCII);
        test("A", US_ASCII, ISO_8859_1); // ASCII 확장(LATIN-1)
        test("A", US_ASCII, EUC_KR); // ASCII 포함
        test("A", US_ASCII, MS_949); // ASCII 포함
        test("A", US_ASCII, UTF_8); // ASCII 포함
        test("A", US_ASCII, UTF_16BE); // UTF_16 디코딩 실패

        System.out.println("== 한글 인코딩 - 기본 ==");
        test("가", US_ASCII, US_ASCII); // X
        test("가", ISO_8859_1, ISO_8859_1); // X
        test("가", EUC_KR, EUC_KR);
        test("가", MS_949, MS_949);
        test("가", UTF_8, UTF_8);
        test("가", UTF_16, UTF_16);

        System.out.println("== 한글 인코딩 - 복잡한 문자 ==");
        test("뷁", EUC_KR, EUC_KR); // X
        test("뷁", MS_949, MS_949);
        test("뷁", UTF_8, UTF_8);
        test("뷁", UTF_16BE, UTF_16BE);

        System.out.println("== 한글 인코딩 - 디코딩이 다른 경우 ==");
        test("가", EUC_KR, MS_949);
        test("뷁", MS_949, EUC_KR); // 인코딩 가능, 디코딩 X
        test("가", EUC_KR, UTF_8); // X
        test("가", MS_949, UTF_8); // X
        test("가", UTF_8, MS_949); // X

        System.out.println("== 영문 인코딩 - 디코딩이 다른 경우");
        test("A", EUC_KR, UTF_8);
        test("A", MS_949, UTF_8);
        test("A", UTF_8, MS_949);
        test("A", UTF_8, UTF_16BE); // X
    }

    private static void test(String text, Charset encodingCharset, Charset decodingCharset) {
        byte[] encoded = text.getBytes(encodingCharset);
        String decoded = new String(encoded, decodingCharset);
        System.out.printf("%s -> [%s] 인코딩 -> %s %sbyte -> [%s] 디코딩 -> %s\n",
                text, encodingCharset, Arrays.toString(encoded), encoded.length,
                decodingCharset, decoded);
    }
}
```

실행 결과
```
== 영문 ASCII 인코딩 ==
A -> [US-ASCII] 인코딩 -> [65] 1byte -> [US-ASCII] 디코딩 -> A
A -> [US-ASCII] 인코딩 -> [65] 1byte -> [ISO-8859-1] 디코딩 -> A
A -> [US-ASCII] 인코딩 -> [65] 1byte -> [EUC-KR] 디코딩 -> A
A -> [US-ASCII] 인코딩 -> [65] 1byte -> [x-windows-949] 디코딩 -> A
A -> [US-ASCII] 인코딩 -> [65] 1byte -> [UTF-8] 디코딩 -> A
A -> [US-ASCII] 인코딩 -> [65] 1byte -> [UTF-16BE] 디코딩 -> �
== 한글 인코딩 - 기본 ==
가 -> [US-ASCII] 인코딩 -> [63] 1byte -> [US-ASCII] 디코딩 -> ?
가 -> [ISO-8859-1] 인코딩 -> [63] 1byte -> [ISO-8859-1] 디코딩 -> ?
가 -> [EUC-KR] 인코딩 -> [-80, -95] 2byte -> [EUC-KR] 디코딩 -> 가
가 -> [x-windows-949] 인코딩 -> [-80, -95] 2byte -> [x-windows-949] 디코딩 -> 가 가 -> [UTF-8] 인코딩 -> [-22, -80, -128] 3byte -> [UTF-8] 디코딩 -> 가
가 -> [UTF-16BE] 인코딩 -> [-84, 0] 2byte -> [UTF-16BE] 디코딩 -> 가
== 한글 인코딩 - 복잡한 문자 ==
뷁 -> [EUC-KR] 인코딩 -> [63] 1byte -> [EUC-KR] 디코딩 -> ?
뷁 -> [x-windows-949] 인코딩 -> [-108, -18] 2byte -> [x-windows-949] 디코딩 -> 뷁 뷁 -> [UTF-8] 인코딩 -> [-21, -73, -127] 3byte -> [UTF-8] 디코딩 -> 뷁
뷁 -> [UTF-16BE] 인코딩 -> [-67, -63] 2byte -> [UTF-16BE] 디코딩 -> 뷁
== 한글 인코딩 - 디코딩이 다른 경우 ==
가 -> [EUC-KR] 인코딩 -> [-80, -95] 2byte -> [x-windows-949] 디코딩 -> 가
뷁 -> [x-windows-949] 인코딩 -> [-108, -18] 2byte -> [EUC-KR] 디코딩 -> ��
가 -> [EUC-KR] 인코딩 -> [-80, -95] 2byte -> [UTF-8] 디코딩 -> ��
가 -> [x-windows-949] 인코딩 -> [-80, -95] 2byte -> [UTF-8] 디코딩 -> ��
가 -> [UTF-8] 인코딩 -> [-22, -80, -128] 3byte -> [x-windows-949] 디코딩 -> 媛� == 영문 인코딩 - 디코딩이 다른 경우 ==
A -> [EUC-KR] 인코딩 -> [65] 1byte -> [UTF-8] 디코딩 -> A
A -> [x-windows-949] 인코딩 -> [65] 1byte -> [UTF-8] 디코딩 -> A
A -> [UTF-8] 인코딩 -> [65] 1byte -> [x-windows-949] 디코딩 -> A
A -> [UTF-8] 인코딩 -> [65] 1byte -> [UTF-16BE] 디코딩 -> �
```

## 1-4. byte 출력에 음수가 보이는 이유

한글 '가'를 EUC-KR로 인코딩 하면 10110000 10100001 이고 10진수로 표현하면 [176, 161]로 표현한다.   
자바는 양수, 음수 모두 표현하기 위해 byte의 첫 번째 자리를 부호로 사용한다. 0이면 양수, 1이면 음수로 간주한다.   
그래서 자바에서 byte는 256가지 값을 표현하지만, 표현 가능한 숫자의 범위는 -128~127 이다.   
'가'에서 첫 번째 바이트 10110000는 -80, 두 번째 바이트 1010001는 -95로 표현된다.   