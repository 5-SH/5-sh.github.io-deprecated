---
layout: post
title: unixODBC 로 oracle 서버에 연결하기
date: 2021-06-17 22:00:00 + 0900
categories: Linux
ref: oracle, unixodbc, odbc, linux
---

# unixODBC 로 oracle 서버에 연결하기

## 1. oracle instant client 설치   
오라클 홈페이지 에서   
- oracle-instantclient-basic-21.1.0.0.0.-1.x86_64.rpm
- oracle-instantclient-sqlplus-21.1.0.0.0-1.x86_64.rpm
을 받아서 설치한다.   

oracle instant client 는 보통 /usr/lib/oracle/21/client64 에 설치된다.   
필요한 경우 $ORACLE_HOME 를 여기로 잡아주면 된다.

## 2. tnsnames.ora 설정
unixODBC 로 연결하면 필요 없지만 sqlplus 를 사용하는 경우 필요하다.   
$ORACLE_HOME/bin/network/admin 에 vim 으로 tnsnames.ora 를 
아래와 같이 작성한다.   
<br/>
연결할 원격 정보)   
> 10.10.123.123 : 1521   
> id : TEST / pw : TEST   
> database : ORCL   
> SID : ORCL   

<br/>
tnsname.ora 내용)       

```shell
ORCL = 
    (DESCRIPTION = 
        (ADDRESS_LIST = 
            (ADDRESS = (PROTOCOL = TCP)(HOST= 10.10.123.123) (PORT = 1521))
        ) 
        (CONNECT_DATA = 
            (SID = ORCL)
        )    
    )
// HOST : 연결하려는 oracle 서버 주소
// SID : oracle SID
```

## 3. path export 는 따로 해줄 필요 없음
/etc/bashrc 에
```shell
export ORACLE_HOME=/usr/lib/oracle/21/client64
export LD_LIBRARY_PATH=$ORACLE_HOME/lib:$LD_LIBRARY_PATH
export PATH=$ORACLE_HOME/bin:$PATH
export NLS_LANG=AMERICAN_AMERICA.UTF8
```
과 같은 설정을 따로 해줄 필요 없다.

## 4. unixODBC 연결을 위한 libsqora.so.21.1 다운로드
오라클 홈페이지에서 
- instantclient-odbc-linuxx64.zip   

을 받아서 압축을 푼다.   
압축푼 폴더 안의 libsqora.so.21.1 파일을 원하는 곳으로 옮기고
odbcinst.ini 의 Driver, Driver64, Setup 에 경로를 적어준다.   
ex)
libsqora.so.21.1 을 /usr/lib, /usr/lib64 로 옮겼다.   
```shell
[OracleDB]
Description     = ODBC for Oracle
Driver          = /usr/lib/libsqora.so.21.1
Driver64        = /usr/lib64/libsqora.so.21.1
Setup           = /usr/lib/libsqora.so.21.1
FileUsage       = 1
DontDLClose     = 1
CPTimeout       = 5000
```

## 5. odbc.ini 의 ODBC 설정에 ServerName 정보 추가
```
<oracle target server ip 주소>:<oracle 포트>/[database]
```
형식으로 추가하지 않으면   
[unixODBC][Oracle][ODBC][Ora]ORA-12162: TNS: 네트 서비스 이름이 부정확하게 지정됨   
에러가 발생한다.
ex)
```shell
[OracleDB]
Trace       = No
Driver      = OracleDB
Description = Oracle ODBC Datasource
SERVER      = 10.10.123.123
PORT        = 1521
SID         = ORCL
User        = TEST
Password    = TEST
Database    = ORCL
ServerName  = //10.10.123.123:1521/ORCL
```