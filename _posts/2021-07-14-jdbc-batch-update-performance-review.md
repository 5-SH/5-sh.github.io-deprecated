---
layout: post
title: JDBC 를 이용한 Batch Update 의 성능 고찰
date: 2021-07-14 00:30:00 + 0900
categories: DB
ref: JDBC, BatchUpdate
---

출처 : https://m.blog.naver.com/PostView.naver?isHttpsRedirect=true&blogId=theyoung2002&logNo=220629774573

# JDBC 를 이용한 Batch Update 의 성능 고찰

## 1. Batch Update
여러 줄의 DML(Data Manipulation Language) 요청을 하나의 그룹으로 만들어 DB 에 한 번에 요청하는   
Batch Update 처리 기능을 JDBC 2.0 부터 제공하기 시작했다.   
DB 에서 제공하는 쿼리문 자체 update, insert, delete 에 대해 Batch 작업이 가능하지만   
JDBC 에서도 Statement, PreparedStatement, CallableStatement 를 사용해 Batch 작업이 가능하도록 제공하고 있다.

## 2. Batching Statement
JDBC 의 Statement 인터페이스를 사용해 Batch 처리를 할 수 있다.

```java
statement.addBatch(
  "INSERT INTO post (title, version, id)" +
  "VALUES ('post no 1', 0, 1)"
);
statement.addBatch(
  "INSERT INTO post_comment(post_id, review, version, id)" +
  "VALUES (1, 'Post comment 1.1', 0, 1)"
);
int[] updateCounts = statement.executeBatch();
```

## 3.  Oracle 의 Batch 처리
Oracle 은 Statement 와 CallableStatement 를 사용한 Batch 처리를 내부적으로 지원하지 않는다.   
오라클 드라이버 자체적으로 Batch 처리 요청을 무시하고 개별적인 처리로 수행하게 된다.   
그러나 PreparedStatement 를 사용하면 Batch 처리가 가능하다.


## 4. MySQL 의 Batch 처리
MySQL 은 내부적으로 Batch Statement 를 하나의 요청으로 처리하지 않는다.   
대신 rewriteBatchedStatements 라는 것을 제공한다. 내부적으로 하나의 String 버퍼에 붙여 넣는 방법으로 처리한다. 그리고 입력되는 row 별 키를 얻어 오기 위해 insert 문만 처리 가능하다.   
<br/>
PreparedStatement 같은 경우 내부적으로 multi-value insert 로 다시 재정의된다. 이 기능을 사용하기 위해 rewriteBatchedStatements 를 true 로 설정해야 Batch 처리가 가능하다. rewriteBatchedStatements 의 default 설정은 false 이다.

## 5. Batch 처리 성능
Batch 처리를 위해 DB 의 최적 batch size 를 찾아서 사용해야 한다.   
오히려 큰 batch size 는 성능이 떨어지는 현상이 발생한다.   
table1 에 5,000 ~ 30,000 건의 insert 를 수행하고 20 ~ 50 건의 image update 처리를 Batch 처리하고   
table2 에 5,000 ~ 30,000 건의 insert 를 수행하고 20 ~ 50 건의 image update 처리를 일반적인 insert 를 수행한다.   
<br/>
table1 의 Batch 처리를 모든 row 가 insert 되었을 때 commit 하도록 하면   
table2 의 insert 작업이 거의 수행되지 않는다.
table1 의 Batch 처리를 50 개의 row 가 insert 될 떄 마다 commit 하도록 하면
table2 의 insert 작업도 함께 수행한다.
DB 의 전체 성능이 떨어지지 않도록 batch size 의 값을 튜닝할 필요가 있다.
