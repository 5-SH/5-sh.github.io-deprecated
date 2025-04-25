---
layout: post
title: 대규모 시스템으로 설계된 게시판에 사용된 Spring 문법과 요소 기술 - Tranaction
date: 2025-02-20 13:00:00 + 0900
categories: Traffic
ref: java, Spring, board
---

<!-- ### 강의 : [스프링부트로 대규모 시스템 설계 - 게시판](https://www.inflearn.com/course/%EC%8A%A4%ED%94%84%EB%A7%81%EB%B6%80%ED%8A%B8%EB%A1%9C-%EB%8C%80%EA%B7%9C%EB%AA%A8-%EC%8B%9C%EC%8A%A4%ED%85%9C%EC%84%A4%EA%B3%84-%EA%B2%8C%EC%8B%9C%ED%8C%90/dashboard) -->

# 대규모 시스템으로 설계된 게시판에 사용된 Spring 문법과 요소 기술 - Tranaction

# 1. 트랜잭션 경계 설정
트랜잭션의 시작 선언(setAutoCommiot(false))하고 트랜잭션을 종료하는 하는 작업(commit(), rollback())을 트랜잭션 경계 설정이라 한다.   
transaction 경계 설정은 Connection을 열고 사용한 뒤 닫는 사이에서 일어난다.   
Service 계층에서 트랜잭션 경계를 설정하는 작업을 하고 쿼리 실행을 위해 DAO에 Connection을 전달해야 한다.   

<br/>

그러면 아래 코드와 같이 DAO는 데이터 엑세스 기술에 독립적이지 않게 된다.   
왜냐하면 트랜잭션 경계 설정을 JDBC 방식으로 Service 계층에서 구현하고 Connection 객체를 DAO 까지 전달하기 때문이다.   
JTA나 Hibernate로 DAO 구현 방식을 변경하려면 Connection 대신 JTA에서 사용하는 EntityManager나 Hibernate에서 사용하는 Session 객체를 DAO가 전달 받도록 수정해야 한다.   
따라서 DAO의 인터페이스는 바뀌게 되고 UserService 코드도 바뀌어야 한다.

```java
class UserService {
    public void upgradeLevels() throws Exception {
        Connection c = ...;
        // 트랜잭션 시작
        ...
        try {
            ...
            upgradeLevel(c, user);
            ...
            c.commit()
        } catch (Exception e) {
            c.rollback()
            throw e;
        } finally {
            c.close()
        }
        // 트랜잭션 종료
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

## 1-1. TransactionSynchronizations
위 코드에서 Connection 객체를 파라메터로 직접 전달하는 문제를 트랜잭션 동기화 저장소인 TransactionSynchronizations로 해결할 수 있다.      
Service 계층에서 트랜잭션 시작을 위해 만든 Connection을 특별한 저장소에 보관해 두고 이후에 호출되는 DAO 메소드에서 저장된 Connection을 가져다 사용한다.   
트랜잭션 동기화 저장소는 작업 스레드마다 독립적으로 Connection 오브젝트를 저장하고 관리하기 때문에 멀티스레드 환경에서 충돌이 나지 않는다.

![Image](https://github.com/user-attachments/assets/b7136271-aceb-47f6-b5a7-217dd7349bb2)

- (1)에서 커넥션을 생성하고 (2)에서 트랜잭션 동기화 저장소에 저장한다.
- dao.update()를 호출하면(3) DAO는 트랜잭션 동기화 저장소에서 Connection을 가져오고(4) Connection을 사용해 쿼리를 실행한다(5)
- 나머지 두 번의 dao.update 호출은 같은 방식으로 동작한다. (6)-(7)-(8), (9)-(10)-(11)
- 서비스에서 작업이 완료되면 커넥션을 반환한다.


```java
Private DataSource dataSource;

public void setDataSource(DataSourcedataSource) {
    this.dataSource = dataSource;
}

public void upgradeLevels() throws Exception {
    // 트랜잭션 동기화 관리자를 이용해 동기화 작업을 초기화한다.
    TransactionSynchronizationManager.initSynchronization();
    // DB 커넥션을 생성하고 트랜잭션을 시작한다.
    Connection c = DataSourceUtils.getConnection(dataSource);
    c.setAutoCommit(false);

    try {
        List<User> users = userDao.getAll();
        for (user user : users) {
            if (anUpgradeElvel(user)) {
                upgradeLevel(user);
            }
        }
        c.commit();
    } catch (Exceptio e) {
        c.rollback();
        throw e;
    } finally {
        // 스프링 유티릴티 메소드를 이용해 DB 커넥션을 안전하게 닫는다.
        DataSourceUtils.releaseConnection(c, dataSource);
        // 동기화 작업 종료 및 정리
        TransactionSynchronizationManager.unbindResource(this.dataSource);
        TransactionSynchronizationManager.clearSynchronization();
    }
}
```
트랜잭션 동기화 관리 클래스는 TransactionSynchronizationManager을 사용한다.   
DataSourceUtils에서 제공하는 getConnectin() 메소드를 통해 DB 커넥션을 생성하고 트랜잭션 동기화에 사용될 저장소에 바인딩 해준다.   
트랜잭션 동기화가 바인딩 된 채로 JdbcTemplate를 사용하면 동기화시킨 DB 커넥션을 사용한다.   

### 1-1-1. JdbcTemplate와 트랜잭션 동기화
JdbcTemplate는 트랜잭션 동기화 저장소에 등록된 DB 커넥션이나 트랜잭션이 없는 경우 JdbcTemplate가 직접 DB 커넥션을 만들어 사용한다.   
트랜잭션 동기화를 시작해 놓았다면 그 때 부터 실행되는 JdbcTemplate의 메소드에서는 직접 DB 커넥션을 만들지 않고 트랜잭션 동기화 저장소에 들어있는 DB 커넥션을 가져와 사용한다.

## 1-2. 트랜잭션 서비스 추상화
여러 DB Connection에 걸쳐 트랜잭션 경계를 설정하려면 글로벌 트랜잭션을 지원하는 JTA를 사용해야 한다.   
또는 ORM을 사용하기 위해 JPA 구현체인 Hibernate를 사용하려 한다면,   
트랜잭션 경계를 설정하는 구현이 JDBC, JTA, Hibernate 에서 모두 다르기 때문에 Service 계층이 특정 기술에 의존적이게 된다.   

아래 코드는 JTA를 이용한 트랜잭션 코드 구조이다.    
트랜잭션 경계 설정을 Connection 메소드를 사용하는 JDBC 코드와 다르게 UserTransaction의 메소드를 사용한다.
```java
InitailContext ctx = new InitialContext();
UserTransaction tx = (UserTransaction)ctx.lookup(USER_TX_JNDI_NAME);

tx.begin();
Connection c = dataSource.getConnection();
try {
    // 데이터 액세스 코드
    tx.commit()
} catch (Exception e) {
    tx.rollback();
    throw e;
} finally {
    c.close();
}
```

Hibernate를 이용한 트랜잭션 관리 코드는 JDBC, JTA와 또 다르다.   
Hibernate는 Connection을 직접 사용하지 않고 Session이라는 것을 사용하고 독자적인 트랜잭션 관리 API를 사용한다.   
따라서 Service 계층이 DAO 인터페이스에만 의존하지 못하고 Connection, UserTransaction, Session/Transaction API 등에 종속되게 되었다.    

### 1-2-1. PlatformTransactionManager
스프링은 트랜잭션 기술의 공통점을 담은 트랜잭션 추상화 기술인 PlatformTransactionManager을 제공한다.   
PlatformTransactionManager 구현 클래스로 DataSourceTransactionManager, JpaTransactionManager, HibernateTransactionManager, JtaTransactionManager가 있다.   

![Image](https://github.com/user-attachments/assets/e266ae38-d06a-4569-a861-7753bc3adbf6)


아래 코드는 스프링의 트랜잭션 추상화 API를 적용한 코드이다.   

```java
public void upgradeLevels() {
    PlatformTransactionManager transactionManager = new DataSourceTransactionManager(dataSource);
    TransactionStatus status = transactionManager.getTransaction(new DefaultTransactionDefinition());
    try {
        List<User> users = userDao.getAll();
        for (User user : users) {
            if (canUpgradeLevel(usr)) {
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

JDBC의 로컬 트랜잭션을 이용한다면 PlatformTransactionManager을 구현한 DataSourceTransactionManager를 사용하면 된다.   
getTransaction() 메소드는 PlatformTransactionManager에서 트랜잭션을 가져와 시작하는 요청이다.   
DefaultTransactionDefinition 객체는 트랜잭션에 대한 디폴트 속성을 담고 있다.   

<br/>

스프링의 트랜잭션 추상화 기술은 트랜잭션 동기화를 사용한다.   
PlatformTransactionManager로 시작한 트랜잭션은 트랜잭션 동기화 저장소에 저장된다.   
DataSourceTransactionManager 오브젝트는 JdbcTemplate에서 사용될 수 있는 방식으로 트랜잭션을 관리해 준다.    
따라서 PlatformTransactionManager로 시작한 트랜잭션은 DAO의 JdbcTemplate 안에서 사용된다.   

### 1-2-2. 트랜잭션 기술 설정의 분리
PlatformTransactionManager를 통해 Service 계층의 코드 수정 없이 글로벌 트랜잭션을 지원하는 JTA를 사용할 수 있다.   
위 예시 코드에서 transactionManager를 선언하는 부분을 아래와 같이 바꿔준다.   

```java
PlatformTransactionManager transactionManager = new JTATransactionManager(dataSource);
```

Hibernate를 사용하려면 아래와 같이 선언하는 부분을 바꿔준다.

```java
PlatformTransactionManager transactionManager = new HibernateTransactionManager(dataSource);
```

그리고 아래와 같이 빈으로 주입해 사용할 수 있다.   

```java
public class UserService {
    ...
    private PlatformTransactionManager transactionManager;

    public void setTransactionManager(PlatformTransactionManager transactionManager) {
        this.transactionManager = transactionManager;
    }

    public void upgradeLevels() {
        TransactionStatus status = this.transactionManager.getTransaction(new DefaultTransactionDefinition());
        try {
        List<User> users = userDao.getAll();
        for (User user : users) {
            if (canUpgradeLevel(usr)) {
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

```xml
<bean id="userService" class="springbook.user.service.UserService">
    <property name="userDao" ref="userDao" />
    <property name="transactionManager" ref="transactionManager" />
</bean>

<bean id="transactionManager" class="org.springframework.jdbc.datasource.DataSourceTransactionManager">
    <property name="dataSource" ref="dataSource" />
</bean>
```

### 1-2-3. 코드에 의한 트랜잭션 경계 설정

PlatformTransactionManager을 사용해서 코드에서 직접 트랜잭션을 처리할 수 있다.   
이 경우 try/catch 블록을 매번 써야 하는 번거로움이 있어 템플릿/콜백 방식의 TrasactionTemplate를 사용한다.   
보통 @Transactional 애노테이션을 사용해 선언적으로 설정하지만, 에러 발생 시 디버깅 또는 테스트 코드 작성을 할 때 코드에 의한 트랜잭션 경계 설정 방법을 사용할 수 있다.   

```java
public class MemberService {
    @Autowired private MemberDao memberDao;
    private TransactionTemplate transactionTemplate;

    @Autowired
    public void init(PlatformTransactionManager transactionManager) {
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    public void addMembers(final List<Member> members) {
        this.transactionTemplate.execute(new TransactionCallback {
            public Object doInTransaction(TransactionStatus status) {
                // 트랜잭션 안에서 동작하는 코드
                for (Member m : members) {
                    memberDao.addMember(m);
                }
                /**
                 * 작업을 마치고 리턴되면 트랜잭션은 커밋된다.
                 * 만약 이전에 시작한 트랜잭션에 참여 했다면 해당 트랜잭션의 작업을 모두 마칠 때까지 커밋은 보류된다.
                 * 리턴되기 이전에 예외가 발생하면 트랜잭션은 롤백된다.
                 */
                return null;
            }
        });
    }
}
```

### 1-2-4. 선언적 트랜잭션 경계 설정

선언적 트랜잭션을 사용해 코드 작성 없이 원하는 메소드 실행 전 후에 트랜잭션이 시작되고 종료되거나 기존 트랜잭션에 참여하도록 만들 수 있다.   
이를 위해서 트랜잭션 프록시 빈을 사용하는데 간단한 설정으로 특정 부가기능을 타깃 오브젝트에 부여할 수 있는 프록시 AOP를 주로 사용한다.   
aop 스키마의 태그와 tx 스키마의 태그를 사용해 아래와 같이 선언적으로 트랜잭션 경계를 설정할 수 있다.   
AOP에서 빈 오브젝트에 적용하려는 부가기능을 "어드바이스"라고 하고 어드바이스를 적용할 선정 대상을 "포인트컷"이라고 한다.   
그리고 "어드바이스"와 "포인트컷"을 결합해 "어드바이저"라고 부른다.

```xml
<tx:advice id="txAdvice" transaction-manager="transactionManager">
    <tx:attributes>
        <tx:method name="*">
    </tx:attributes>
</tx:advice>

<aop:config>
    <aop:pointcut id="txPointcut" expression="execution(* *..MemberDao.*(..))">
    <aop:advisor advice-ref="txAdvice" pointcut-ref="txPointcut" />
</aop:config>
```

또는 @Transactional 애노테이션을 사용해 간단하게 선언할 수 있다.

# 2. 트랜잭션 속성
아래는 AOP를 활용해 메소드에서 트랜잭션 경계를 설정하는 코드이다.   
트랜잭션을 가져올 떄 DefaultTransactionDefinition을 파라메터로 넘겨주는데, 이 객체는 트랜잭션의 동작방식에 영향을 줄 수 있는 네 가지 속성을 정의한다.   

```java
public Object invoke(MethodInvocation invocation) throws Throwable {
    TransactionStatus status = this.transactionManager.getTransaction(new DefaultTransactionDefinition());
    try {
        Object ret = invocation.proceed();
        this.transactionManager.commit(status);
    } catch (RuntimeException e) {
        this.transctionManager.rollback(status);
        throw e;
    }
}
```

## 2-1. 트랜잭션 전파
트랜잭션 전파는 독자적인 트랜잭션 경계를 가진 코드에 대해 이미 진행 중인 트랜잭션이 어떻게 영향을 미칠 수 있는가를 정의한다.   

- PROPAGATION_REQUIRED: 진행 중인 트랜잭션이 없으면 새로 시작하고, 이미 시작된 트랜잭션이 있으면 이에 참여한다.
- PROPAGATION_REQUIRES_NEW: 항상 새로운 트랜잭션을 시작한다.
- PROPAGATION_NOT_SUPPORTED: 트랜잭션 없이 동작한다.

트랜잭션 없이 동작하는 PROPAGATION_NOT_SUPPORTED 속성은 다음과 같은 상황에 사용한다.   
트랜잭션 경계설정은 AOP를 이용해 한 번에 많은 메소드에 적용한다.   
이 때 특별한 메소드만 트랜잭션 적용에서 제외 하려면, 모든 메소드에 트랜잭션 AOP가 적용되게 하고 특정 메소드의 트랜잭션 전파 속성만 PROPAGATION_NOT_SUPPORTED로 설정해서 트랜잭션 없이 동작하게 만들 수 있다.   

<br/>

### 2-1-1. getTransaction()으로 트랜잭션을 시작하는 이유

트랜잭션 매니저에서 트랜잭션을 시작하려 할 때 getTransaction() 메소드를 사용한다.    
트랜잭션 매니저의 getTransaction() 메소드는 항상 트랜잭션을 새로 시작하는 것이 아니다.    
트랜잭션 전파 속성과 현재 진행 중인 트랜잭션이 존재하는지 여부에 따라서 새로운 트랜잭션을 시작 하거나 이미 진행 중인 트랜잭션에 참여한다.    

## 2-2. 격리수준

서버 환경에서 여러 트랜잭션이 동시에 진행될 수 있다.   
이 때 격리수준으로 특정 트랜잭션이 다른 트랜잭션에서 변경하거나 조회하는 데이터를 볼 수 있게 허용할지 말지를 결정해, 가능한 한 많은 트랜잭션을 동시에 진행시키면서도 문제가 발생하지 않게 제어한다.   

<br/>

격리 수준에는 READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE 이 있다.

## 2-3. 제한시간
트랜잭션을 수행하는 timeout.    
DefaultTransactionDefinition의 기본 설정은 timeout 제한시간이 없다.   

## 2-4. 읽기전용

읽기전용으로 설저해두면 트랜잭션 내에서 데이터를 조작하는 시도를 막아줄 수 있다.   
DefaultTransactionDefinition를 사용하는 대신 트랜잭션 정의를 수정하려면,
TransactionDefinition 오브젝트를 DI 받아서 DefaultTransactionDefinition 대신 사용하도록 만들면 된다.

# 3. 트랜잭션 애노테이션

@Transactional 애노테이션을 활용해 트랜잭션의속성과 경계 설정을 선언적으로 할 수 있다.

```java
// 애노테이션을 사용할 대상을 메소드와 타입(클래스, 인터페이스)으로 설정
@Target({ElementType.METHOD, ElementType.TYPE})
// 애노테이션 정보가 런타임 때 까지 사용할 수 있도록 설정
@Retention(RetentionPolicy.RUNTIME)
// 상속을 통해서도 애노테이션 정보를 얻을 수 있도록 설정
@Inherited
@Documented
public @interface Transactional {
    // 트랜잭션 속성의 모든 항목을 엘리먼트로 지정
    String value() default "";
    Propagation propagation() default Propagation.REQUIRED;
    Isolation isolation() default Isolation.DEFAULT;
    int timeout() default TransactionDefinition.TIMEOUT_DEFAULT;
    boolean readOnly() default false;
    Class<? extends Throwable>[] rollbackFor() default {};
    String[] rollbackForClassName() default {};
    Class<? extends Throwable>[] noRollbackFor() default {};
    String[] noRollbackForClassName() default {};
}
```

@Transactional 애노테이션은 타깃 메소드, 타깃 클래스, 선언 메소드, 선언 타입 순서에 따라서 적용한다.    
아래 코드의 [1]~[6] 여섯 군데에서 애노테이션을 선언할 수 있다.   
그리고 [5], [6] -> [4] -> [2], [3] -> [1] 우선 순위로 애노테이션이 적용된다.
```java
[1]
public interface Service {
    [2]
    void method1();
    [3]
    void method2();
}
[4]
public class ServiceImple implements Service {
    [5]
    public void method1() {
    }
    [6]
    public void method2() {
    }
}
```

트랜잭션의 자유로운 전파와 유연한 개발이 가능할 수 있었던 배경에는 AOP와 트랜잭션 추상화이다.   
AOP를 통해 트랜잭션 부가기능을 @Transactional 애노테이션으로 간단히 애플리케이션에 선언적으로 적용할 수 있다.   
그리고 트랜잭션 추상화 덕분에 데이터 액세스와 트랜잭션 기술에 상관 없이 DAO에서 일어나는 작업들을 하나의 트랜잭션으로 묶어 추상 레벨에서 관리할 수 있었다.   
트랜잭션 추상화 기술의 핵심은 트랜잭션 매니저와 트랜잭션 동기화이다.   
PlatformTransactionManager 인터페이스를 구현한 트랜잭션 매니저를 통해 구체적인 트랜잭션 기술의 종류와 상관 없이 일관된 트랜잭션 제어가 가능하다.   
그리고 트랜잭션 동기화 기술 덕분에 트랜잭션 정보를 저장소에 보관했다가 DAO에서 사용할 수 있다.   
