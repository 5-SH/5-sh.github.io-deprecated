---
layout: post
title: 티베로 테이블의 데드락 해결
date: 2021-03-26 13:10:00 +0900
categories: Dev
ref: DB
---
# 티베로 테이블의 데드락 해결

- ### 증상   
    execute query 가 실행 안되고 select 결과가 이전의 결과를 리턴한다   

- ### 해결   
    1. **SELECT * FROM v$lock where type = 'WLOCK_TX';** 로 락 걸린 세션을 찾아 kill 한다.
    2. 위에서 조회 결과가 없으면   
**SELECT * FROM V$LOCK ORDER BY CTIME DESC;**  로 조회해서 CTIME 이 큰 순서대로 SESS_ID 를 가져와 세션을 kill 한다.   
SERIALID 는 v$session 테이블에서 SID = SESS_ID 조건으로 검색
    3. 세션은 **ALTER SYSTEM KILL SESSION 'SID,SERIAL';** 로 kill 한다.
