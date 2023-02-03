---
layout: post
title: 데이터베이스 트랜잭션 경계와 동기화
date: 2023-02-03 19:00:00 + 0900
categories: DB
ref: DB, transaction, transaction manager
---

# 데이터베이스 트랜잭션 경계와 동기화

## 1. 들어가기
비즈니스 로직과 관련된 쿼리들을 처리하는 도중에 네트워크가 끊기거나 서버에 장애가 생겨 작업을 완료할 수 없게 되면 그 때 까지 처리된 쿼리들은 초기 상태로 되돌려져야 합니다.    
DBMS 에 하나의 쿼리를 처리하는 경우에는 트랜잭션을 보장한다고 믿을 수 있습니다.   
하지만 여러 개의 쿼리 작업을 하나의 트랜잭션으로 취급해야 하는 경우 그렇지 않습니다. 모든 쿼리가 처리되기 전에 장애가 생겨 작업이 중단되면 이미 처리된 쿼리들은 취소되지 않습니다.    
여러 개의 쿼리들을 하나의 트랜잭션으로 처리하는 경우모든 쿼리 작업이 완료된 후 트랜잭션 커밋을 통해 쿼리 처리가 성공적으로 완료됐다고 DBMS 에 알려줘서 작업을 확정시켜야 합니다. 반대로 쿼리 처리 중간에 실패한 경우 트랜잭션 롤백을 해야 합니다.

## 2. 트랜잭션 경계 설정
애플리케이션 내에서 트랜잭션이 시작되고 끝나는 위치를 트랜잭션의 경계라고 합니다.    
JDBC 를 이용해 트랜잭션 경계를 적용하는 경우 아래와 같이 코드를 작성할 수 있습니다.   

```java
...
Connection c = dataSource.getConnection();

c.setAutoCommit(false);  // 트랜잭션 시작
try {
  PreparedStatement st1 = c.prepareStatement("update users ...");
  st1.executeUpdate();

  PreparedStatement st2 = c.prepareStatement("delete users ...");
  st2.executeUpdate();

  c.commit();  // 트랜잭션 커밋
} catch(Exception e) {
  c.rollback();  // 트랜잭션 롤백
}

c.close();
```

위 코드에서 데이터소스를 통해 얻은 Connection으로 트랜잭션 경계를 설정하고 있습니다. 그리고 데이터 액세스를 위한 DAO 는 쿼리 처리를 위해 JdbcTemplate 를 사용하기 때문에 각 메소드마다 하나 씩의 독립적인 트랜잭션으로 실행될 수 밖에 없습니다.   
따라서 DAO 를 사용하면 비즈니스 로직을 담고 있는 서비스 계층에서 진행되는 여러가지 쿼리 작업을 하나의 트랜잭션으로 묶는 일이 어려워 집니다.   

일반적으로 서비스 게층은 비즈니스 로직을 담고, DAO 는 데이터 로직을 담습니다. 그리고 트랜잭션의 경계는 서비스 계층에서 설정합니다.   
쿼리 처리를 위한 트랜잭션은 커넥션보다 존재 범위가 짧기 때문에 DAO 메소드에서 같은 Connection 객체를 공유하도록 파라미터로 전달해 줘야 합니다.   

```java
Class UserService {
  public void upgradeLevels() throws Exception {
    Connection c = ...;
    ...
    try {
      ...
      upgradeLevel(c, user);
      ...
    }
    ...
  }

  protected void upgradeLevel(Connection c, User user) {
    user.upgradeLevel();
    userDao.update(c, user);
  }
}

interface UserDao {
  public update(Connection c, User user);
  ...
}
```

위 코드는 JdbcTemplate 를 활용할 수 없어 데이터 액세스 로직을 깔끔하게 처리할 수 없고 매번 파라미터로 Connection 객체를 넘겨줘야 하기 떄문에 DAO 가 데이터 액세스 기술에 독립적일 수 없다는 큰 단점이 있습니다.   
이런 문제를 해결하기 위해 트랜잭션 동기화를 사용합니다.   

## 3. 트랜잭션 동기화
Connection 객체를 파라미터로 넘기는 대신 특별한 저장소에 보관하고 가져다 쓰는 방식이 있습니다.   
이 저장소는 트랜잭션 동기화 저장소 라고 부르며, 스레드 마다 독립적으로 Connection 객체를 저장하고 관리하기 위해 ThreadLocal 을 사용하기 때문에 멀티 스레드 환경에서 충돌이 발생하지 않습니다.    

스프링이 제공하는 트랜잭션 동기화 관리 클래스는 __TransactionSynchronizationManager__ 로서 아래와 같이 사용합니다.    

```java
// 서비스 계층의 메소드
public void upgradeLevels() throws Exception {
  TransactionSynchronizationManager.initSynchronization();  // 트랜잭션 동기화 작업 초기화
  Connection c = DataSourceUtils.getConnection(dataSource);  // DB 커넥션을 생성하고 동기화를 함
  c.setAutoCommit(false);  // 트랜잭션 시작

  try {
    List<Users> users = userDao.getAll();
    for (User user : users) {
      if (canUpgradeLevel(user)) {
        upgradeLevel(user);
      }
    }
    c.commit();
  } catch (Exception e) {
    c.rollback();
    throw e;
  } finally {
    DataSourceUtils.releaseConnection(c, dataSource)  // DB 커넥션 종료
    TransactionSynchronizationManager.unbindResource(this.dataSource);  // 동기화 작업 종료 및 정리
    TransactionSynchronizationManager.clearSynchronization();  // 동기화 작업 종료 및 정리
  }
}
```

__DataSourceUtils.getConnection()__ 메소드를 통해 DB 커넥션을 생성하고 트랜잭션 동기화에 사용되도록 저장소에 바인딩 해줍니다.    
트랜잭션 동기화가 되어 있는 채로 JdbcTemplate 를 사용하면 JdbcTempalte 작업에서 동기화 시킨 DB 커넥션을 사용하게 됩니다.   
따라서 upgradeLevels() 에서 JdbcTemplate 를 통해 수행하는 쿼리 작업들은 같은 Connection 객체에서 만든 같은 트랜잭션에 참여하게 됩니다.    

## 4. JdbcTemplate 과 트랜잭션 동기화   
JdbcTemplate 는 내부적으로 직접 Connection 을 생성하고 동작합니다.   
만약 트랜잭션 동기화 저장소에 등록된 DB 커넥션이나 트랜잭션이 없는 경우 JdbcTemplate 가 직접 DB 커넥션을 만들고 트랜잭션을 시작해 쿼리를 처리합니다.     
트랜잭션 동기화를 시작해 놓았다면 그 때 부터 실행되는 JdbcTemplate 메소드 에서는 직접 DB 커넥션을 만드는 대신 트랜잭션 동기화 저장소에 들어있는 DB 커넥션을 가져와서 사용합니다.     

현재까지 방법은 서비스 계층에서 트랜잭션의 경계를 설정하며 특정 데이터 액세스 기술에 종속되는 구조가 되었습니다.    
JDBC 에 종속적인 Connection 을 이용한 트랜잭션 코드가 서비스 계층에 등장 하면서 하이버네이트나 JTA 등 다른 데이터 액세스 기술을 사용하기 위해선 서비스 계층의 코드를 수정하게 되었습니다.     
트랜잭션의 경계 설정을 담당하는 코드는 일정한 패턴을 갖는 유사한 구조를 가집니다.    
스프링은 데이터 액세스 기술은 JDBC, JTA, 하이버네이트, JPA 의 공통점들을 뽑아내 트랜잭션 처리 코드를 추상화 했습니다.   

## 5. 트랜잭션 서비스 추상화
스프링은 아래 그림과 같이 __PlatformTransactionManager__ 인터페이스를 통해 트랜잭션 서비스를 추상화 했습니다.    

![image](https://user-images.githubusercontent.com/13375810/217791966-fd3d482c-f217-4317-acbb-1b964b2c30bf.png)
이미지 출처: https://gngsn.tistory.com/152    

PlatformTransactionManager 를 활용한 트랜잭션 경계 설정 방법은 아래와 같습니다.    
아래 코드에선 JDBC 를 사용했기 때문에 PlatformTransactionManager 구현체로 DataSourceTransactionManager 를 사용했습니다.    
만약 서비스 계층에서 JTA 를 활용해 트랜잭션 경계를 설정하려 한다면,     
PlatformTransactionManager transactionManager = new DataSourceTransactionManager(dataSource) 를    
PlatformTransactionManager transactionManager = new JtaTransactionManager(dataSource) 로 바꿔주기만 하면 됩니다.    
그리고 DefaultTransactionDefinition 객체는 트랜잭션에 대한 속성을 담고 있습니다. 자세한 내용은 뒤에서 설명 하겠습니다.   

PlatformTransactionManager 의 구현 클래스는 멀티 스레드 환경에서 스레드 세이프 하고 싱글톤으로 사용 가능합니다.    

```java
// 서비스 계층의 메소드
public void upgradeLevels() {
  PlatformTransactionManager transactionManager = new DataSourceTransactionManager(dataSource);  // JDBC 트랜잭션 추상 오브젝트 생성
  TransactionStatus status = transactionManager.getTransaction(new DefaultTransactionDefinition());  // 트랜잭션을 가져옴

  try {
    List<User> users = userDao.getAll();
    for (User user : users) {
      if (canUpgradeLevel(user)) {
        upgradeLevel(user);
      }
    }
    transactionManager.commit(status);
  } catch (RuntimeException e) {
    transactionManager.rollback(status);
    throw e;
  }
}
```

## 6. TransactionTemplate
트랜잭션을 처리하기 위해 PlatformTransactionManager 의 메소드를 직접 사용해도 되지만 try/catch 블록을 매번 작성해야 하는 번거로움이 발생합니다.    
그래서 PlatformTransactionManager 의 메소드를 직접 사용하는 대신 템플릿/콜백 방식의 TransactionTemplate 를 사용하면 편리합니다.    

```java
pubilc class UserService {
  @Autowired private UserDao userDao;
  private TransactionTemplate transactionTemplate;

  @Autowired public void init(PlatformTransactionManager transactionManager) {
    this.transactionTemplate = new TransactionTemplate(transactionManager);
  }

  public void addUsers(final List<User> users) {
    this.transactionTemplate.execute(status -> {
      for (user u : users) {
        userDao.addUser(u);
      }
    });
  }
}
```

지금까지 코드로 트랜잭션 경계를 직접 설정하는 방법을 알아 보았습니다.   
매번 코드로 트랜잭션 경계를 설정하지 않아도 __tx 네임스페이스를 활용한 AOP__ 나 __@Transactional__ 애노테이션을 통해 선언적으로 트랜잭션 경계를 설정하는 방법이 있습니다.   

## 7. 트랜잭션 속성
DefaultTransactionDefinition 이 구현하고 있는 TransactionDefinition 인터페이스는 트랜잭션 동작에 영향을 주는 속성을 정의합니다.   

### 7-1. 트랜잭션 전파
트랜잭션을 시작하거나 기존 트랜잭션에 참여하는 방법을 결정합니다.    

    1. REQUIRED : 미리 시작된 트랜잭션이 있으면 참여하고 없으면 새로 시작합니다.   
    2. SUPPORTS : 이미 시작된 트랜잭션이 있으면 참여하고 그렇지 않으면 트랜잭션 없이 진행합니다.   
    3. MANDATORY : 이미 시작된 트랜잭션이 있으면 참여합니다. 그러나 시작된 트랜잭션이 없으면 새로 시작하는 대신 예외를 발생 시킵니다.   
    4. REQUIRES_NEW : 항상 새로우 트랜잭션을 시작합니다.   
    5. NOT_SUPPORTED : 트랜잭션을 사용하지 않게 합니다. 진행 중인 트랜잭션이 있으면 보류 시킵니다.   
    6. NEVER : 트랜잭션을 사용하지 않도록 강제합니다. 진행 중인 트랜잭션이 있으면 예외를 발생 시킵니다.   
    7. NESTED : 진행 중인 트랜잭션이 있으면 중첩 트랜잭션을 시작합니다. 중첩된 트랜잭션은 먼저 시작된 부모 트랜잭션의 커밋과 롤백에는 영향을 받지만 자신의 커밋과 롤백은 부모 트랜잭션에게 영향을 주지 않습니다.   

### 7-2. 트랜잭션 격리수준
동시에 여러 트랜잭션이 진행될 때 트랜잭션의 작업 결과를 다른 트랜잭션에게 어떻게 노출할 것 인지를 결정하는 기준 입니다.   
자세한 내용은 [DB 의 트랜잭션 격리 수준](https://5-sh.github.io/db/2022/08/06/DB-transaction-isolation-level.html) 문서를 참고해 주세요.    

### 7-3. 트랜잭션 제한시간
초 단위로 트랜잭션에 제한시간을 지정할 수 있습니다. 디폴트는 트랜잭션 시스템의 제한 시간을 따릅니다.   

### 7-4. 읽기 전용 트랜잭션
트랜잭션을 읽기 전용으로 설정할 수 있습니다.   

### 7-5. 트랜잭션 롤백, 커밋 예외
스프링에서 데이터 액세스 기술의 예외는 런타임 예외로 전환 되어서 던져지고 런타임 예외만 롤백 대상으로 삼습니다.    
하지만 체크 예외 중 롤백 대상으로 삼아야 하는 것이 있다면 rollbackForClassName 속성 값을 사용해 예외로 지정할 수 있습니다.   

롤백 대상인 런타임 예외를 커밋 대상으로 예외 지정해 줍니다. noRollbackForClassName 속성 값을 사용합니다.    



출처1 : 토비의 스프링 Vol1 - 5장 서비스 추상화
출처2 : 토비의 스프링 Vol2 - 2장 데이터 액세스 기술   
