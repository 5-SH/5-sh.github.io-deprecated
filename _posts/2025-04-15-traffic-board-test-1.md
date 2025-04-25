---
layout: post
title: 대규모 시스템으로 설계된 게시판의 성능 - DB 조회
date: 2025-04-15 11:50:00 + 0900
categories: Traffic
ref: java, Spring, board, traffic
---

<!-- ### 강의 : [스프링부트로 대규모 시스템 설계 - 게시판](https://www.inflearn.com/course/%EC%8A%A4%ED%94%84%EB%A7%81%EB%B6%80%ED%8A%B8%EB%A1%9C-%EB%8C%80%EA%B7%9C%EB%AA%A8-%EC%8B%9C%EC%8A%A4%ED%85%9C%EC%84%A4%EA%B3%84-%EA%B2%8C%EC%8B%9C%ED%8C%90/dashboard) -->

# 대규모 시스템으로 설계된 게시판의 성능 - DB 조회

1200만 건의 게시글 데이터가 있는 article 테이블에 쿼리를 실행하면 많은 시간이 걸린다.    
이 문제를 해결하기 위한 과정을 설명한다.    
게시글 서비스와 MySQL을 실행한 PC는 8세대 i5 CPU와 8GB 메모리 그리고 디스크는 SSD를 사용한다.    
MySQL 서버는 같은 PC에서 도커로 실행했다.   

## 1. 게시글 조회

아래 사진과 같이 30건의 게시글을 조회하는데 35s가 걸린다.

![1 인덱스 없이 조회](https://i.imgur.com/oHudGdq.jpeg)

아래 실행 계획을 살펴보면, type: ALL 이므로 테이블을 풀스캔 했고    
Using filesort 이므로 정렬을 할 때 데이터를 메모리에 모두 올리지 못하고 디스크를 사용한 것을 알 수 있다.

![2 인덱스 없이 쿼리조회 실행계획](https://i.imgur.com/4xTDcDk.jpeg)

## 2. 인덱스를 사용해 게시글 조회

board_id와 article_id로 인덱스를 만들고 쿼리를 실행하면 아래 사진과 같이 0.02s가 걸리는 것을 확인할 수 있다.   

![3 ARTICLE INDEX 추가](https://i.imgur.com/QS9oloR.jpeg)

![4 인덱스 추가해 쿼리조회](https://i.imgur.com/tnb0BiD.jpeg)

실행 계획을 살펴보면, key: idx_board_id_article_id 이므로 생성한 인덱스가 쿼리에 사용된 것을 알 수 있다.   

![5 인덱스 추가해 쿼리조회 실행계획](https://i.imgur.com/B4cZpGa.jpeg)

## 3. 큰 오프셋으로 게시글 조회

1499970과 같이 큰 오프셋으로 게시글을 조회하면 아래와 같이 2m 46s가 걸리는 것을 확인할 수 있다.   
실행 계획을 보면 인덱스를 사용했지만 조회 하는데 매우 많은 시간이 걸렸다.   

![6 오프셋 1499970 조회](https://i.imgur.com/3GRD5d6.jpeg)

![7 오프셋 1499970 실행계획](https://i.imgur.com/WgSOFXF.jpeg)

인덱스에는 Clustered Index와 Secondary Index가 있다. Index는 B+ tree 자료구조를 사용한다.    
Primary Key로 만들어진 Index를 Cluster Index라 하고, board_id, article_id와 같이 PK가 아닌 컬럼으로 만든 Index를 Secondary Index라 한다.   
Cluster Index는 PK를 설정하면 자동으로 생성되고 트리에서 leaf node는 실제 row 데이터를 가진다.   
Secondary Index의 트리에서 leaf node는 인덱스로 설정한 컬럼들의 데이터와 Clustered Index에 접근하기 위한 포인터를 가진다.   

<br/>

board_id와 article_id로 정렬된 Secondary Index에서 정렬된 값을 사용하더라도 실제 row 데이터를 가져오기 위해 매번 Clustered Index의 leaf node에 접근한다.    
이 때문에 조회에 많은 시간이 걸리게 되었다.   

## 4. 커버링 인덱스를 사용해 조회

앞서 설명한 Secondary Index에서 매번 Clustered Index의 leaf node에 접근해 실제 row 데이터를 가져오는 비효율적인 조회를 피하기 위해 Secondary Index에서 필요한 30건에 대해서 article_id만 먼저 추출하고 Clustered Index에 접근 하도록 한다.   
서브 쿼리에서 aritlce_id를 먼저 조회하고 조인해 조건에 맞는 row를 가져오도록 쿼리를 수정해 실행하면 아래와 같이 1s만에 결과가 나오는 것을 확인할 수 있다.   

![8 커버링 인덱스 사용](https://i.imgur.com/VNVSF0d.jpeg)

실행 계획을 보면, 동일하게 idx_board_id_article_id를 사용하고 Extra: Using index 이므로 인덱스만 사용해 데이터를 조회한 것을 알 수 있다.   
인덱스 만으로 쿼리의 모든 데이터를 처리할 수 있는 인덱스를 Covering Index라고 한다.    
Covering Index는 Clustered Index에서 데이터를 읽지 않고 Secondary Index에 포함된 정보만으로 쿼리 가능한 인덱스이다.   

![9 커버링 인덱스 실행계획](https://i.imgur.com/Ij9Zozf.jpeg)

## 5. 매우 큰 오프셋을 조회

Secondary Index와 Covering Index를 사용하더라도 매우 큰 오프셋을 조회하는데 시간이 오래 걸릴 수 있다.    
Secondary Index의 트리를 조회 하는데 오래 걸린 것 이므로 물리적으로 데이터를 분리해 절대적인 조회 시간을 줄이는 방법으로 해결해야 한다.    
게시글을 1년 단위로 테이블을 분리하고 offset을 1년 동안 작성된 게시글 수 단위로 skip하고 인덱스 페이지 단위로 skip 하도록 수정해 해결할 수 있다.   
이 방법을 위해선 데이터를 연도에 따라 저장하도록 데이터베이스와 애플리케이션에서 수정이 필요하다.   
또는 매우 큰 수의 페이지를 조회하는 요청은 어뷰징으로 판단하고 요청을 거절하는 정책으로 해결할 수 있다.   

![10 매우 큰 오프셋 조회](https://i.imgur.com/rtFsVXq.jpeg)

![11 매우 큰 오프셋 조회 실행계획](https://i.imgur.com/rSDftjg.jpeg)