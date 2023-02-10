---
layout: post
title: JTA 를 활용한 분산 트랜잭션 관리
date: 2023-02-04 20:30:00 + 0900
categories: DB
ref: DB, transaction, transaction manager, jta
---

## 1. 들어가기
비즈니스 로직과 관련된 쿼리들이 여러 종류의 데이터베이스에 걸쳐 수행될 수 있습니다. 이 경우 하나의 데이터베이스를 대상으로 하는 DataSourceTransactionManager 를 사용한 방법으로는 트랜잭션 동기화를 사용할 수 없습니다.    

JdbcTemplate 내부에서 DataSourceTransactionManager 를 통해 관리하는 트랜잭션을 로컬 트랜잭션, JTA 를 활용해 여러 데이터베이스에 걸쳐 트랜잭션을 관리하는 것을 글로벌 트랜잭션이라고 합니다.    
JtaTransactionManager 를 통해 글로벌 트랜잭션을 처리하는 방법을 알아 보겠습니다.    

## 2. JtaTransactionManager
데이터베이스 액세스를 위해 주로 JDBC 와 iBatis 두 가지 기술을 사용하고, 두 기술을 지원하는 DataSourceTransactionManager 를 트랜잭션을 통합하는데 주로 사용합니다. 그리고 DataSourceTransactionManager 에서 트랜잭션을 통합 하려면 항상 동일한 DataSource 를 사용해야 합니다. 따라서 여러 DataSource 를 같은 트랜잭션 안에서 동작하게 만들 수 없습니다.     

DataSourceTransactionManager 는 'TransactionManager를 식별 -> DataSource에서 Connection 추출 -> Transaction 동기화(커넥션 저장)' 순서로 진행 됩니다.    
만약 AbstractRoutingDataSource 를 상속한 RoutingDataSource 에서 여러 데이터소스를 관리할 경우, DataSourceTransactionManager 가 현재 커넥션을 ThreadLocal 에 저장하는 트랜잭션 동기화 작업을 수행한 이후에 RoutingDataSource 에서 타깃 데이터소스 변경이 수행되어 이전 사용하던 데이터소스를 사용하게 됩니다.     
따라서 DataSourcTransactionManager 를 사용하면 여러 DataSource 를 가튼 트랜잭션 안에서 동작하게 만들 수 없습니다.

JtaTransactionManager 를 사용하면 여러 데이터베이스에 액세스 하는 작업을 하나의 트랜잭션으로 관리할 수 있습니다. 그리고 모든 종류의 데이터 액세스 기술을 지원합니다. 보통 JTA(Java Transaction Api) 는 서버에 설정한 XA DataSource 와 트랜잭션 매니저를 가져와 트랜잭션을 관리해 줍니다. 그러나 서버의 지원 없이도 애플리케이션 안에 JTA 서비스 기능을 내장해 사용하는 방법도 있습니다. 독립형 JTA 트랜잭션 매니저라고 불리는 이 기술은 JOTM, Atomikos 라는 오픈 소스를 주로 사용합니다. 이번 테스트 에서는 Atomikos 를 사용했습니다.   

JtaTransactionManager 는 JTA 트랜잭션 매니저를 스프링에서 사용하게 해주는 트랜잭션 추상화를 위한 클래스 입니다. 따라서 구체적인 내용들을 설정해야 합니다.    

먼저 JTA 트랜잭션 매니저와 사용자 트랜잭션을 등록합니다.   

```xml
<bean id="atomikosTransactionManager" class="com.atomikos.icatch.jta.UserTransactionManager" init-method="init" destroy-method="close">
    <property name="forceShutdown">
        <value>true</value>
    </property>
</bean>

<bean id="atomikosUserTransaction" class="com.atomiks.icatch.jta.UserTransactionImp">
    <property name="transactionTimeout">
        <value>300</value>
    </property>
</bean>

<bean id="transactionManager" class="org.springframework.transaction.jta.JtaTransactionManager">
    <property name="transactionManager" ref="atomikosTransactionManager" />
    <property name="userTransaction" ref="atomikosUserTransaction" />
</bean>
```

다음으로 분산 트랜잭션 환경에서 트랜잭션 매니저와 리소스 매니저 사이에 통신을 위한 인터페이스인 XA 를 지원하는 DataSource 를 빈으로 등록합니다. JTA 에서 사용할 DataSource 는 고유한 리소스 이름을 지정해야 합니다.   

```xml
<bean id="dataSource1" class="com.atomikos.jdbc.AtomikosDataSourceBean" init-method="init" destroy-method="close">
    <property name="uniqueResourceName" value="MySQLXA1" />
    <property name="xaDataSourceClassName" value="com.mysql.jdbc.jdbc2.optional.MysqlXADataSource" />
    <property name="xaProperties">
        <props>
            <prop key="user">dbuser</prop>
            <prop key="password">dbuser</prop>
            <prop key="url">jdbc:mysql://10.40.235.168:3306/mysql</prop>
        </props>
    </property>
    <property name="poolSize" value="4>
</bean>

<bean id="dataSource2" class="com.atomikos.jdbc.AtomikosDataSourceBean" init-method="init" destroy-method="close">
    <property name="uniqueResourceName" value="MariaXA1" />
    <property name="xaDataSourceClassName" value="com.microsoft.sqlserver.jdbc.SQLServerXADataSource" />
    <property name="xaProperties">
        <props>
            <prop key="user">dbuser</prop>
            <prop key="password">iotmgr1!</prop>
            <prop key="url">jdbc:mariadb://10.40.235.168:3305/mariadb</prop>
        </props>
    </property>
    <property name="poolSize" value="4>
</bean>
...
```

이제 각 데이터소스를 사용하는 JDBC DAO 나 iBatis Mapper 를 만들어 사용할 수 있습니다.
스프링부트에서 제공하는 spring-boot-starter-jta-atomikos 를 사용하면 필요한 설정이 미리 되어 있습니다. 따라서 데이터소스만 추가해 사용하면 됩니다.   