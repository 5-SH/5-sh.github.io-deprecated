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

READ UNCOMMITTED 격리 수준은 __커밋되지 않은 레코드도 읽습니다.__    
사용자 A 의 세션에서 Lara 라는 직원을 추가하고 커밋하기 전에 사용자 B 의 세션에서 Lara 직원을 검색하고 있습니다.   
사용자 B 는 READ UNCOMMITTED 격리 수준에서 커밋되지 않은 Lara 직원을 조회할 수 있습니다.   
<br/>
그러나 사용자 A 세션에서 처리 도중 문제가 발생해 롤백을 하더라도     
사용자 B 는 Lara 가 정상적으로 추가된 직원이라 생각하고 작업을 계속 처리해 문제가 발생합니다.   
<br/>
READ UNCOMMITTED 는 정합성에 문제가 많은 격리 수준으로 DB 에서 사용되지 않습니다.   

## 3. READ COMMITTED

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/183228248-c8297b3c-3a50-4e35-adff-07e67e77e58e.png" width="55%"/>
  <figcaption>▲ READ COMMITTED</figcaption>
</figure>

READ COMMITTED 는 __커밋이 완료된 데이터만 다른 트랜잭션에서 조회할 수 있는 격리 수준__ 으로,   
오라클 DBMS 에서 기본으로 사용되는 격리 수준이고 가장 많이 선택되는 격리 수준입니다.    
<br/>
커밋되지 않은 추가, 삭제, 수정 작업은 언두 로그에 저장되고    
다른 트랜잭션은 커밋되지 않은 레코드를 조회할 때 언두 로그 내용을 조회합니다.     
따라서 READ COMMITTED 는 DIRTY READ 문제가 발생하지 않습니다.   
이런 변경 방식을 __MVCC(Multi Version Concurrency Control)__ 라고 합니다.   
<br/>
그러나 아래와 같이 NON-REPEATABLE READ 문제가 발생할 수 있습니다.     

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/183228795-3386d795-5f9b-4a93-bdfd-33529ad09bb2.png" width="55%"/>
  <figcaption>▲ NON-REPEATABLE READ</figcaption>
</figure>

사용자 B 세션에서 __SELECT FROM employees WHERE first_name='Toto'__ 쿼리를 두 번 실행할 때 결과가 다르게 나타납니다.     
하나의 트랜잭션에서 동일한 데이터를 여러 번 읽고 변경하는 작업을 수행하면 문제가 될 수 있습니다.

## 4. REPEATABLE READ

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/183229362-92bc0a75-247b-4f09-be60-0bab690f9860.png" width="55%"/>
  <figcaption>▲ REPEATABLE READ</figcaption>
</figure>

REPEATABLE READ 는 MySQL ㄱ의 InnoDB 스토리지 엔진에서 기본으로 사용되는 격리 수준입니다.   
READ COMMITTED 와 같이 언두 로그를 통해 커밋되기 전의 데이터를 보여줍니다.    
둘의 차이는 언두 영역에 백업된 레코드의 여러 버전 가운데 몇 번째 이전 버전까지 찾아 들어가야 하느냐에 있습니다.   
<br/>
모든 InnoDB 의 트랜잭션은 고유한 트랜잭션 번호를 가지고    
언두 영역에 백업된 모든 레코드에는 변경을 발생시킨 트랜잭션의 번호가 포함되어 있습니다.    
그리고 언두 영역의 백업된 데이터는 InnoDB 스토리지 엔진이 불필요하다고 판단하는 시점에 주기적으로 삭제합니다.   
<br/>
REPEATABLE READ 격리 수준에서는 MVCC 를 보장하기 위해    
실행 중인 트랜잭션 가운데 가장 오래된 트랜잭션 번호보다 트랜잭션 번호가 앞선 언두 영역의 데이터는 삭제할 수 없습니다.    
<br/>
사용자 B 가 트랜잭션을 시작해 트랜잭션 번호 10번을 부여 받았고 사용자 A 는 12 번을 부여 받았습니다.    
이 때 부터 사용자 B 의 10번 트랜잭션 안에서 실행되는 모든 SELECT 쿼리는 트랜잭션 번호가 10 보다 작은    
트랜잭션 번호에서 변경한 것만 보이게 됩니다.    
<br/>
REPEATABLE READ 는 NON_REPEATABLE READ 문제를 해결하지만   
아래와 같이 PHANTOM READ 문제가 발생할 수 있습니다.

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/183229479-a674373d-2c92-4970-934e-be4d9a6041da.png" width="55%"/>
  <figcaption>▲ PHANTOM READ</figcaption>
</figure>

사용자 A 가 INSERT 를 하는 도중에 사용자 B 가 __SELECT ... FOR UPDATE__ 쿼리로 employees 테이블을 두 번 조회했을 때     
쿼리 결과가 다르게 나올 수 있습니다.   
<br/>
__SELECT ... FOR UPDATE__ 쿼리는 SELECT 하는 레코드에 쓰기 잠금을 걸어야 하는데, 언두 레코드에는 잠금을 걸 수 없습니다.    
그래서 __SELECT ... FOR UPDATE__ 나 __SELECT ... LOCK IN SHARE MODE__ 로 조회되는 레코드는    
언두 영역의 변경 전 데이터를 가져오는 것이 아니라 현재 레코드의 값을 거져오게 되는 것입니다.   

## 5. SERIALIZABLE

가장 엄격한 격리 수준이다. 그만큼 동시 처리 성능도 떨어집니다.   
InnoDB 테이블에서 기본적으로 __INSERT ... SELECT__ 또는 __CREATE TABLE ... AS SELECT ...__ 가 아닌    
순수한 __SELECT__ 작업은 잠금을 설정하지 않고 실행됩니다. (잠금이 필요 없는 일관된 읽기, Non-locking consistent read)    
<br/>
하지만 트랜잭션 격리 수준이 SERIALIZABLE 로 설정 되면 읽기 작업도 공유 잠금을 획득해야만 하며,    
동시에 다른 트랜잭션은 레코드를 변공하지 못합니다.    
따라서 SERIALIZABLE 격리 수준에서는 PHANTOM READ 문제가 발생하지 않습니다.    
<br/>
SERIALIZABLE 격리 수준은 동시 처리 성능이 많이 떨어져 실제로 사용되지 않습니다.
