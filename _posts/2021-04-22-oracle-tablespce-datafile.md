---
layout: post
title: 오라클 테이블스페이스
date: 2021-04-22 12:40:00 + 0900
categories: DB
ref: DB
---

# 오라클 Tablespace 와 Datafile

## 1. Tablespce 와 Datafile 개요
  오라클은 data 를 논리적으로 tablespace 에 물리적으로는 datafile 에 저장한다.   
![Screenshot_20210422-115149_Samsung Internet](https://user-images.githubusercontent.com/13375810/115649596-92cd9080-a362-11eb-9533-3629b8352ab2.jpg)   

  Database, tablespace, datafile 은 긴밀하게 연결되어 있다.
  - 오라클의 database 는 하나 이상의 논리적 저장소인 tablespace 로 구성되어 있다.
  - 각 tablespace 는 하나 이상의 datafile 로 구성되어 있다. datafile 은 오라클이 동작 중인 OS 에 맞게 적용된 물리적 구조이다.
  - database 의 data 는 datafile 에 저장되고 datafile 은 tablespace 를 구성한다. 그리고 tablespace 가 모여 database 를 구성한다. 

## 2. Database 에 추가 공간 할당하기
  database 에 세 가지 방법으로 추가 공간을 할당할 수 있다.
  - tablespace 에 datafile 추가
  - 새로운 tablespace 생성
  - datafile 의 사이즈 늘이기

#### 1) tablespace 에 datafile 추가
![Screenshot_20210422-121647_Samsung Internet](https://user-images.githubusercontent.com/13375810/115650667-a24dd900-a364-11eb-8996-8cbf40979d8e.jpg)

#### 2) 새로운 tablespace 생성
![Screenshot_20210422-122048_Samsung Internet](https://user-images.githubusercontent.com/13375810/115650940-3029c400-a365-11eb-9129-437b5731abde.jpg)

#### 3) datafile 의 사이즈 늘이기
![Screenshot_20210422-122138_Samsung Internet](https://user-images.githubusercontent.com/13375810/115651018-564f6400-a365-11eb-97e4-ac912ffa28e6.jpg)

## 3. 테이블 스페이스 사용법

#### 1) 테이블 스페이스 생성
```sql
CREATE TABLESPACE [테이블 스페이스 명]
DATAFILE [파일경로]
SIZE [초기 데이터 파일 크기]
AUTOEXTEND ON NEXT 10M -- 초기 크기 공간을 모두 사용하면 크기를 자동으로 10M 만큼 늘인다.
MAXSIZE 100M -- 데이터파일이 최대로 커질 수 있정 크기를 100M으로 지로
UNIFORM SIZE 1M -- EXTENT 한 개의 크기를 1M으로 설정
```

#### 2) 전체 테이블 스페이스 조회
```sql
SELECT * FROM dba_tablespaces;
```

#### 3) 전체 테이블 스페이스 경로 및 용량 조회
```sql
SELECT A.TABLESPACE_NAME "테이블스페이스명",
       A.FILE_NAME "파일경로",
       (A.BYTES - B.FREE)    "사용공간",
       B.FREE                 "여유 공간",
       A.BYTES                "총크기",
       TO_CHAR( (B.FREE / A.BYTES * 100) , '999.99')||'%' "여유공간"
  FROM (SELECT FILE_ID,
               TABLESPACE_NAME,
               FILE_NAME,
               SUBSTR(FILE_NAME,1,200) FILE_NM,
               SUM(BYTES) BYTES
          FROM DBA_DATA_FILES
      GROUP BY FILE_ID,TABLESPACE_NAME,FILE_NAME,SUBSTR(FILE_NAME,1,200)
        ) A,
        (SELECT TABLESPACE_NAME,
                FILE_ID,
                SUM(NVL(BYTES,0)) FREE
           FROM DBA_FREE_SPACE
        GROUP BY TABLESPACE_NAME,FILE_ID
        ) B
 WHERE A.TABLESPACE_NAME=B.TABLESPACE_NAME
       AND A.FILE_ID = B.FILE_ID;
```

#### 4) 테이블의 테이블 스페이스 변경
```sql
ALTER TABLE [테이블 명] move tablespace [테이블 스페이스 명]
```

#### 5) 테이블 속성 변경/삭제
```sql
-- 테이블 스페이스의 물리적인 파일의 이름 또는 위치 변경
ALTER TABLESPACE RENAME [A] TO [B];

-- 테이블 스페이스의 용량을 1024 메가로 변경
ALTER TABLESPACE [테이블 스페이스명] ADD DATAFILE [추가할 데이터파일명] SIZE 1024M;

-- 데이터 파일 경로에 해당하는 테이블스페이스의 크기가 FULL 되면 자동으로 100M 씩 증가
ALTER DATABASE DATAFILE [데이터 파일 경로] 'autoextend on next 100m maxsize unlimited';

-- 테이블 스페이스 내의 객체 모두 삭제
DROP TABLESPACE [테이블 스페이스명] INCLUDE CONTENTS;

-- 테이블 스페이스의 모든 세그먼트를 삭제 (데이터가 있는 테이블 스페이스 제외외
DROP TABLESPACE [테이블 스페이스명] INCLUDING CONTENTS;

-- 테이블 스페잇의 물리적 파일까지 삭제
DROP TABLESPACE [테이블 스페이스명명 INCLUDING CONTENTS AND DATAFILES;
```

