---
layout: post
title:  대규모 시스템으로 설계된 게시판에 사용된 Spring 문법과 요소 기술들
date: 2025-03-23 08:00:00 + 0900
categories: Spring
ref: java, Spring, board, traffic
---

### 강의 : [스프링부트로 대규모 시스템 설계 - 게시판](https://www.inflearn.com/course/%EC%8A%A4%ED%94%84%EB%A7%81%EB%B6%80%ED%8A%B8%EB%A1%9C-%EB%8C%80%EA%B7%9C%EB%AA%A8-%EC%8B%9C%EC%8A%A4%ED%85%9C%EC%84%A4%EA%B3%84-%EA%B2%8C%EC%8B%9C%ED%8C%90/dashboard)

# 대규모 시스템으로 설계된 게시판의 구조

## 0. 서비스 별로 다루는 기술들

|No|서비스|목적|기술|
|---|---|---|---|
|1|Article|게시글 관리|DB Index(clustered, secondary, covering index), 페이징(limit, offset)|
|2|Comment|댓글 관리|2 depth(인접리스트), 무한 depth(경로열거)|
|3|Like|좋아요 관리|일관성(Transaction), 동시성(pessimistic, optimistic lock, 비동기 순차처리)|
|4|View|조회수 관리|Redis, TTL을 통한 Distributed Lock|
|5|Hot Article|인기글 관리|Consumer-Event Driven Architecture / Producer-Transactional Message(Transactional Outbox), shard key coordinator|
|6|Article Read|게시글 조회 개선||

## 1. Article
Article 서비스는 게시글을 Distributed RDBMS인 MySQL의 Article 테이블에 생성, 삭제, 수정한다.   
그리고 게시글을 조회하기 위한 페이징 기능을 제공한다.   
게시글의 개수가 1,000만 건 수준으로 많아지면 페이징을 위한 limit, offset 연산과 게시글 정렬 과정이 오래 걸려 게시글의 조회에 수 초가 걸리게 된다.   
이 문제를 Article 테이블에 적절한 인덱스를 설정해 해결할 수 있다.   
<br/>
[Article 테이블]   

|이름|타입|
|---|---|
|article_id|bigint|
|title|varchar(100)|
|content|varchar(3000)|
|board_id|bigint|
|writer_id|bigint|
|created_at|datetime|
|modified_at|datetime|

### 1-1. 페이징
많은 게시글의 순차적인 조회를 위해 페이징 기법을 제공한다.   
페이징 기법은 MySQL의 limit와 offset 연산을 통해 제공할 수 있다.    

#### 1-1-1. 페이지 번호
페이지 번호 방식은 N번 페이지의 M개의 게시글 정보와 전체 게시글 수 정보가 필요하다.    
N번 페이지의 M개의 게시글 정보는 limit와 offset 연산으로 조회할 수 있고 이 때 발생하는 성능 문제는 아래 설명하는 Secondary, Covering Index로 해결할 수 있다.   
그리고 게시글의 수가 많으면 전체 게시글의 수를 조회할 때 테이블을 풀 스캔해야하기 때문에 성능 문제가 발생할 수 있다.   
그러나 아래 사진과 같이 현재 페이지(N)와 페이지에 보여주는 게시글의 수(M)의 값에 따라 페이지 번호 목록을 보여주는데 전체 게시글 수가 필요하지 않고 이동 가능한 페이지 개수의 최대 값 까지만 조회하면 된다.   
<br/>
따라서 현재 페이지(N), 페이지 당 게시글 개수(M), 이동 가능한 페이지 개수(K) 일 때 게시글의 수 정보를,    
((N - 1) / K + 1) * M * K + 1로 조회해 성능을 개선할 수 있다.

<figure>
  <img src="https://github.com/user-attachments/assets/5fb916e7-e170-44ab-95bf-4efb183e83af" height="100" />
  <figcaption></figcaption>
</figure>


#### 1-1-2. 무한 스크롤

### 1-2. Index
#### 1-2-1. Clustered Index
MySQL은 테이블을 생성할 때 설정한 PK로 Clustered Index를 생성하는데, 이 인덱스의 leaf node는 실제 row 값을 갖고 있다.   
PK인 article_id는 snowflake를 사용한 PK 이다. snowflake는 분산 시스템에서 고유한 오름차순을 위해 개발된 알고리즘 이다.   

|비트 수|필드|설명|
|---|---|---|
|1 bit|기호 비트|항상 양수를 보장|
|41 bit|타임스탬프|현재 시간(밀리초)=기준시간(epoch)|
|10 bit|워커 ID|데이터센터 & 서버 ID|
|12 bit|시퀀스 번호|같은 밀리초 내에서 생성디는 번호|

```
| 0 |  00011010101010101010101010101010101010101  | 0000010101 | 000000000001 |
```

#### 1-2-2. Secondary Index
게시글을 조회하기 위해 게시글을 생성 일자 역순으로 정렬하고 limit, offset 연산을 한다.   
매번 조회를 할 때 마다 테이블을 풀스캔 해서 정렬해야 해서 조회 속도가 느리게 된다.    
그리고 데이터가 많은 경우 메모리에 모두 올려서 정렬을 할 수 없기 때문에 디스크에서 정렬을 수행하는 filesort도 하게 되어 속도가 더욱 느려진다.

```sql
select * from article
where board_id = {board_id}
order by created_at desc
limit {limit} offset {offset};
```

게시글을 추가, 삭제할 때 정렬이 될 수 있도록 Article 테이블에 인덱스를 추가한다.    
article_id는 snowflake를 사용한 PK 이고 snowflake는 분산 시스템에서 고유한 오름차순을 위해 개발된 알고리즘 이므로 게시글 생성 시간 정렬에 craated_at 대신에 사용할 수 있다.   
시분초를 사용하는 created_at을 사용하면 게시글 생성 요청이 동시에 오는 경우 같은 값을 가질 수 있기 때문에 article_id로 정렬한다.

```sql
create index idx_board_id_article_id on article(board_id asc, artice_id desc);
```

board_id와 article_id로 생성한 인덱스를 Secondary Index라고 한다.    
Secondary Index의 leaf node는 인덱스 정보인 board_id, article_id 값과 실제 row의 포인터를 갖고 있다.    
그래서 Secondary Index에서 조회하고 전체 row 정보를 찾기 위해 포인터를 이용해 Clustered Index의 leaf node에 접근한다.   

#### 1-2-3. Covered Index
offset을 1,500,000과 같이 큰 값으로 조회를 하면 여전히 수 초가 걸리는 것을 확인할 수 있다.   
Secondary Index에서 offset 만큼 스캔을 할 때 매번 Clustered Index의 leaf node에 접근해 실제 row 데이터를 가져온다.   
왜냐하면 Secondary Index의 컬럼이 아닌 where 조건이 있는 경우 조건 확인하기 위해서 이다.   
그래서 offset 크기인 1,500,000번 만큼 실제 row를 가져오기 때문에 속도가 느려지게 된다.   

<figure>
  <img src="https://github.com/user-attachments/assets/e169d930-df7f-4ab2-86f1-52c2bbe2271a" height="350" />
  <figcaption>▲ 출처: https://velog.io/%40minbo2002/coveringIndex</figcaption>
</figure>

Secondary Index의 컬럼 만으로 처리할 수 있는 인덱스를 Covering Index라고 한다.   
board_id, article_id 만을 조회하면 실제 row를 가져오지 않고 Secondary Index에서만 순회를 한다.    
필요한 offset 만큼 Secondary Index에서 순회하고 조건에 맞는 row 만 Clustered Index에서 가져오도록 join 연산을 추가해 성능을 개선할 수 있다.   

```sql
select * from(
    select article_id from article
    where board_id = 1
    order by artice id desc
    limit 30 offset 1500000
) t left join article on t.article_id = article.article_id;
```

#### 1-2-4. offset이 더 커지면
Covering Index를 사용해 offset이 커졌을 때 조회 성능을 개선했다.    
그러나 offset이 더 커진다면 Secondary Index를 스캔하는 절대적인 시간 자체가 늘어나 느려질 수 있다.    
이런 경우는 스캔하는 양을 줄여야 하기 때문에 연도 별로 테이블을 나눠 게시글을 저장하거나,    
일정 offset 이상의 조회는 어뷰징으로 판단하고 지원하지 않도록 정책적으로 해결해야 한다.   