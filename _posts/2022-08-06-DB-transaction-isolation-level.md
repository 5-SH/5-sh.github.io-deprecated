---
layout: post
title: DB 의 트랜잭션 격리 수준
date: 2022-08-06 11:00:00 + 0900
categories: DB
ref: DB, transaction, isolation
---

# DB 의 트랜잭션 격리 수준

출처 : REAL MySQL 책

트랜잭션 격리 수준이란 여러 트랜잭션이 동시에 처리될 때    
특정 트랜잭션이 다른 트랜잭션에서 변경하거나 조회하는 데이터를 볼 수 있게 허용할지 말지를 결정하는 것 입니다.   
격리 수준은 __READ UNCOMMITTED__, __READ COMMITTED__, __REPEATABLE READ__, __SERIALIZABLE__ 4가지 가 있습니다.   
<br/>
READ UNCOMMITTED 는 일반적인 DB 에서 거의 사용하지 않고     
SERIALIZABLE 또한 DB 동시성 보장을 위해 거의 사용되지 않습니다.   
격리 수준에서 순서대로 뒤로 갈수록 트랜잭션 간의 데이터 격리 정도가 높아지고 동시 처리 성능도 떨어집니다.   
<br/>
일반적인 온라인 서비스 용도의 DB 는 READ COMMITTED 와 REPEATABLE READ 중 하나를 사용합니다. 

## 1. 부정합 문제 
- __DIRTY READ__ : 트랜잭션에서 처리한 작업이 완료되지 않았는데 다른 트랜잭션에서 볼 수 있는 현상.   
- __NON-REPEATABLE READ__ : 클라이언트가 하나의 트랜잭션 내에서 똑같은 SELECT 쿼리를 여러 번 실행 했을 때 항상 같은 결과를 가져오지 못하는 현상.
- __PHANTOM READ__ : 다른 트랜잭션에서 수행한 변경 작업에 의해 레코드가 보였다 안 보였다 하는 현상.

|        | DIRTY READ | NON-REPEATABLE READ | PHANTOM READ |
|:------|:------:|:------:|:------:|
| READ UNCOMMITTED | 발생 | 발생 | 발생 |
| READ COMMITTED | 없음 | 발생 | 발생 |
| REPEATABLE READ | 없음 | 없음 | 발생(InnoDB 는 없음) |
| SERIALIZABLE | 없음 | 없음 | 없음 |   

## 2. READ UNCOMMITTED

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/183227977-f1f412f0-1c77-4cdf-936a-326d249bd240.png" width="55%"/>
  <figcaption>▲ READ UNCOMMITTED</figcaption>
</figure>

READ UNCOMMITTED 격리 수준은 커밋되지 않은 레코드도 읽는다.    
사용자 A 의 세션에서 Lara 라는 직원을 추가하고 커밋하기 전에 사용자 B 의 세션에서 Lara 직원을 검색하고 있다.   
사용자 B 는 READ UNCOMMITTED 격리 수준에서 커밋되지 않은 Lara 직원을 조회할 수 있다.   
<br/>
그러나 사용자 A 세션에서 처리 도중 문제가 발생해 롤백을 하더라도     
사용자 B 는 Lara 가 정상적으로 추가된 직원이라 생각하고 작업을 계속 처리해 문제가 발생한다.   
<br/>
READ UNCOMMITTED 는 정합성에 문제가 많은 격리 수준으로 DB 에서 사용되지 않는다.   

## 3. READ COMMITTED