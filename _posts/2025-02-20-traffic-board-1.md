---
layout: post
title:  대규모 시스템으로 설계된 게시판에 사용된 Spring 문법과 요소 기술들
date: 2025-02-20 13:00:00 + 0900
categories: Spring
ref: java, Spring, board
---

### 강의 : [스프링부트로 대규모 시스템 설계 - 게시판](https://www.inflearn.com/course/%EC%8A%A4%ED%94%84%EB%A7%81%EB%B6%80%ED%8A%B8%EB%A1%9C-%EB%8C%80%EA%B7%9C%EB%AA%A8-%EC%8B%9C%EC%8A%A4%ED%85%9C%EC%84%A4%EA%B3%84-%EA%B2%8C%EC%8B%9C%ED%8C%90/dashboard)

# 대규모 시스템으로 설계된 게시판에 사용된 Spring 문법과 요소 기술들

## 1. RestClient를 사용해 서버에 요청/응답 받고 서버의 Controller에서 요청 파라메터를 처리하는 방법

## 1-1. RestClient
스프링은 REST 요청을 보내기 위해 3가지 방법을 지원한다.   

- RestClient : API 동기 요청 
- WebClient : API 비동기 요청 
- RestTemplate : RestClient 이전 버전, API 동기 요청

### 1-1-1. Creating a RestClient
RestClient는 static 함수 create로 만들 수 있다.   
builder() 함수로 빌더 패턴을 사용해 기본 URI, path variable, header를 설정하거나 메시지 컨버터, HTTP library를 등을 선택할 수 있다.   
생성된 RestClient는 멀티스레드에서 동시성 문제 없이 안전하게 사용할 수 있다.   

```java
RestClient defaultClient = RestClient.create();

RestClient customClient = RestClient.builder()
    .requestFactory(new HttpComponentsClientHttpRequestFactory())
    .messageConverter(converts -> converters.add(new MyCustomMessageConverter()))
    .baseUrl("https://example.com")
    .defaultUriVariables(Map.of("variable", "foo"))
    .defaultHeader("My-Header", "Foo")
    .defaultCookie("My-Cookie", "Bar")
    .requestInterceptor(myCustomInterceptor)
    .requestInitializer(myCustomInitializer)
    .build();
```

### 1-1-2. Using the RestClient

#### 1-1-2-1. Request URL
RestClient로 HTTP 요청을 만들기 위해 사용할 HTTP method를 먼저 선택한다.   
다음으로 uri 메소드로 요청할 URI를 설정한다.    
header(String, String)을 사용하거나 accept(MediaType...), acceptCharset(Charset...), contentType(MediaType), ContentLength(long) 등 과 같은 명시적인 헤더 등록 함수를 사용해 요청할 헤더 정보를 전달한다.    
   
#### 1-1-2-2. Request headers and body
POST, PUT, PATCH HTTP method를 사용하는 경우 body(Object) 함수를 사용해 요청할 body 값을 설정한다.   
body(Object)는 내부적으로 HTTP Message Conversion을 사용한다.    
body(Object) 대신 제네릭을 지원하는 ParameterizedTypeReference 함수를 사용해 body 값을 설정할 수 있다.   
   
##### HTTP Message Conversion
spring-web 모듈은 HTTP request, response의 InputStream OutputStream에서 보내거나 받아오는 데이터를 읽거나 쓰기 위해 HttpMessageConverter 인터페이스를 갖고 있다.    
HttpMessageConverter 인스턴스는 RestClient와 같은 클라이언트나 Spring MVC REST controllers 같은 서버 쪽에서 사용된다.   
주요 MIME 형식을 구현한 HttpMessageConverter 구현체들을 Spring framework에서 RestClient, RestTemplate 같은 클라이언트 또는 서버 쪽의 RequestappingHandlerAdater에 적용한다.   

<br/>

MessageConverter 구현체

|MessageConverer|설명|
|:---|:---|
|StringHttpMessageConverter|HTTP request, response에서 String 형식을 읽고 쓴다.|
|FormHttpMessageConverter|HTTP request, response의 form data를 읽어 MultiValueMap<String, String> 형식으로 읽고 쓴다.|
|ByteArrayHttpMessageConverter|HTTP request, response에서 Byte[] 형식을 읽고 쓴다.|
|MarshallingHttpMessageConverter|Spring의 Marshaller, Unmarshaller를 사용해 XML 형식을 읽고 쓴다.|
|MappingJacson2HttpMessageConverter|Jackson의 ObjectMapper를 사용해 JSON 형식을 읽고 쓴다.|
|MappingJackson2XmlHttpMessageConverter|XmlMapper를 사용해 XML 형식을 읽고 쓴다.|

그 외 Gson, Json Bind API, protobuf 형식을 읽고 쓰는 MessageConverter 구현체를 지원한다.

#### 1-1-2-3. Retrieving the response
REST 요청이 준비되면 retrieve() 함수를 사용해 요청을 보낼 수 있다.   
그리고 응닶 값은 retrieve() 함수에 이어서 호출하는 body(Class) 함수를 사용해 응답 받을 body 값을 파싱한다.   
.retrieve().body(ParameterizedTypeReference)를 사용해 List 타입 같은 형식으로 파싱할 수 있다.   
그리고 .retrieve().toEntity(Class)를 사용해 ResponseEntity 형식으로 변환할 수 있다.
```java
String result = restClient.get()
    .uri("https://example.com")
    .retrieve()
    .body(String.class);

System.out.println(result);

ResponseEntity<String> result = restClient.get()
    .uri("https://example.com")
    .retrieve()
    .body(String.class);

System.out.println("Response status: " + result.getStatusCode());
System.out.println("Response headers: " + result.getHeaders());
System.out.println("Contents: " + result.getBody());
```

## 1-2. 컨트롤러에서 요청 파라메터를 처리하는 방법
controller 메소드 파라메터에 @RequestBody 애노테이션을 붙여 request body 정보를 HttpMessageConverter를 활용해 Object 형식으로 역직렬화 할 수 있다.   

```java
@PostMapping("/accounts")
public void handle(@RequestBody Account account) {
    // ...
}
```

MVC Config의 Message Converters 옵션을 사용해 message conversion을 커스터마이징 할 수 있다.   
WebMvcConfigurer 인터페이스의 configureMessageConverters() 함수를 오버라이딩해서 HttpMessageConverter를 대체 할 수 있다.   
아래 예제는 기본 ObjectMapper 대신 사용자 ObjectMapper를 사용해 XML과 JSON을 변환한다.   

```java
@Configuration
public class WebConfiguration implements WebMvcConfigurer {

    @Override
    public void configureMessageConverters(List<HttpMessageConverter<?>> converters) {
        Jackson2ObjectMapperBuilder builder = new Jackson2ObjectMapperBuilder()
              .indentOutput(true)
              .dateFormat(new SimpleDateFormat("yyyy-MM-dd"))
              .modulesToInstall(new ParameterNamesModule());
        converters.add(new MappingJackson2HttpMessageConverter(builder.build()));
        converters.add(new MappingJackson2XmlHttpMessageConverter(builder.createXmlMapper(true).build()));
    }
}
```

Spring Boot 애플리케이션의 WebMvcAutoConfiguration은 기본 Converter 외에 등록된 HttpMessageConverter 빈들을 모두 추가한다.    
따라서 Spring Boot 애플리케이션은 HttpMessageConverters 방식을 사용해 설정하는 것이 권장된다.   

<br/>

HttpMessageConverter는 자주 사용하는 설정이 등록되어 있다.   
예를 들어 자동으로 Object를 JSON 또는 XML로 변환한다. 그리고 문자열은 기본적으로 UTF-8로 인코딩 된다.   

<br/>

HttpMessageConverter 빈들은 Converter 목록에 자동으로 추가 되기 때문에 WebMvcConfigurer의 configureMessageConverters를 재정의하는 방식 대신 아래와 같이 HttpMessageConverter를 사용해 재정의 할 수 있다.

```java
@Configuration(proxyBeanMethods = false)
public class MyHttpMessageConvertersConfiguration {
    @Bean
    public HttpMessageConverters customConverters() {
        HttpMessageConverter<?> additional = new AdditionalHttpMessageConverter();
        HttpMessageConverter<?> another = new AnotherHttpMessageConverter();
        return new HttpMessageConverters(additional, another);
    }
}
```

# 2. 빈 스캐닝과 자동 와이어링

## 2-1. @Autowired
@Autowired는 자동와이어링 기법을 이용해서 조건에 맞는 빈을 찾아 자동으로 수정자 메소드나 필드에 넣어준다.   
컨테이너가 타입이나 이름을 기준으로 주입될 빈을 찾아준다. 컨테이너가 자동으로 주입할 빈을 결정하기 어려운 경우 직접 
프로퍼티에 주입할 대상을 지정할 수 있다.   

<br/>

userDao 빈의 구현 클래스인 UserDaoJdbc가 dataSource, sqlService 두 개의 빈에 의존하고 두 개의 빈을 setter 메소드를 호출해 주입하도록 만들어 놨다고 가정한다.

```java
@Bean
public UserDao userDao() {
    UserDaoJdbc dao = new UserDaoJdbc();
    dao.setDataSource(dataSource());
    dao.setSqlService(this.sqlService);
    return dao;    
}
```

dataSource, sqlService 빈을 @Autowired 애노테이션을 통해 컨테이너가 자동으로 주입하도록 할 수 있다.
스프링은 @Autowired가 붙은 수정자 메소드가 있으면 파라미터 타입을 보고 주입이 가능한 빈을 모두 찾는다.   
만약 두 개 이상이 나오면 프로퍼티와 동일한 이름의 빈을 주입한다.   

<br/>

빈을 자동 주입 하려는 필드의 접근 제한자가 private 인 것은 스프링에서 리플렉션 API 이용해 제약조건을 우회해서 값을 넣어주기 때문에 문제 되지 않는다.

```java
public class UserDaoJdbc implements UserDao {
  
    @Autowired
    public void setDataSource(DataSource dataSource) {
        this.jdbcTemplate = new JdbcTemplate(dateSource);
    }
    ...
    @Autowired
    private SqlService sqlService;

    public void setSqlService(SqlService sqlService) {
        this.sqlService = sqlService;
    }
}

@Bean
public UserDao userDao() {
    return new UserDaoJdbc();
}
```

## 2-2. @Component, @ComponentScan
@Autowired 애노테이션을 활용해 아래 코드와 같이 userDao() 메소드를 지울 수 있다.    
하지만 이대로 빌드를 하면 userDao 빈이 등록될 방법이 없고 주입 받을 빈을 찾지 못해 에러가 발생한다.   

```java
@Autowired UserDao userDao;

@Bean
public UserService userService() {
    UserServiceImple service = new UserServiceImpl();
    service.setUserDao(this.userDao);
    service.setMailSender(mailSender());
    return service;
}
```

@Component 애노테이션은 빈으로 등록될 후보 클래서에 붙여주는 마커 역할을 한다.   
userDao 빈이 자동 빈 등록 대상이 되도록 UserDaoJdbc 클래스에 @Component 애노테이션을 추가한다.   

<br/>

컨테이너에서 @Component 애노테이션이 달린 클래스를 자동으로 찾아서 빈으로 등록하는 기능을 디폴트로 제공하지 않기 때문에 빈 스캔 기능을 사용하겠다는 정의가 필요하다.   
@ComponentScan 애노테이션을 사용해 정의할 수 있고 프로젝트 내 모든 클래스패스에서 빈으로 등록할 대상을 찾는 것은 부담이 많이 가는 작업이기 때문에 기준이 되는 패키지를 지정해야 한다.


```java
@Component
public class UserDaoJdbc implements UserDao {
    ...
}

@Configuration
@EnableTransactionManagement
@ComponentScan(basePackages="springbook.user")
public class TestApplicationContext {
    ...
}
```

@Component가 붙은 클래스가 발견되면 새로운 빈을 자동으로 추가한다.   
빈의 아이디는 따로 지정하지 않으면 클래스 이름의 첫 글자를 소문자로 바꿔 사용한다.    
클래스의 이름 대신 다른 이름을 빈의 아이디로 사용하려면 @Component("userDao") 와 같이 이름을 설정할 수 있다.   
자동 빈 등록을 사용하는 경우 빈의 의존관계를 담은 프로퍼티를 따로 지정할 방법이 없기 때문에 프로퍼티 설정에 @Autowired를 활용해 자동와이어링 방식을 적용해야 한다.   

## 2-3.@Service, @Repository
애노테이션을 기준으로 어드바이스 적용 대상을 선별하는 @Transactional과 같이, @Component 애노테이션은 빈 스캔 검색 대상으로 만드는 것 외에 부가적인 용도의 마커로 사용한다.   

<br/>

@Repository 애노테이션은 데이터 액세스 서비스를 제공하는 클래스를 자동 빈 등록 대상으로 만들 때 사용한다.   
@Service 애노테이션은 비즈니스 로직을 담고 있는 서비스 계층의 빈을 자동 등록 대상으로 만들 때 사용한다.   

# 3. 트랜잭션 경계 설정
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

## 3-1. TransactionSynchronizations
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

### 3-1-1. JdbcTemplate와 트랜잭션 동기화
JdbcTemplate는 트랜잭션 동기화 저장소에 등록된 DB 커넥션이나 트랜잭션이 없는 경우 JdbcTemplate가 직접 DB 커넥션을 만들어 사용한다.   
트랜잭션 동기화를 시작해 놓았다면 그 때 부터 실행되는 JdbcTemplate의 메소드에서는 직접 DB 커넥션을 만들지 않고 트랜잭션 동기화 저장소에 들어있는 DB 커넥션을 가져와 사용한다.

## 3-2. 트랜잭션 서비스 추상화
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

### 3-2-1. PlatformTransactionManager
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

### 3-2-2. 트랜잭션 기술 설정의 분리
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

### 3-2-3. 코드에 의한 트랜잭션 경계 설정

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

### 3-2-4. 선언적 트랜잭션 경계 설정

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

# 4. 트랜잭션 속성
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

## 4-1. 트랜잭션 전파
트랜잭션 전파는 독자적인 트랜잭션 경계를 가진 코드에 대해 이미 진행 중인 트랜잭션이 어떻게 영향을 미칠 수 있는가를 정의한다.   

- PROPAGATION_REQUIRED: 진행 중인 트랜잭션이 없으면 새로 시작하고, 이미 시작된 트랜잭션이 있으면 이에 참여한다.
- PROPAGATION_REQUIRES_NEW: 항상 새로운 트랜잭션을 시작한다.
- PROPAGATION_NOT_SUPPORTED: 트랜잭션 없이 동작한다.

트랜잭션 없이 동작하는 PROPAGATION_NOT_SUPPORTED 속성은 다음과 같은 상황에 사용한다.   
트랜잭션 경계설정은 AOP를 이용해 한 번에 많은 메소드에 적용한다.   
이 때 특별한 메소드만 트랜잭션 적용에서 제외 하려면, 모든 메소드에 트랜잭션 AOP가 적용되게 하고 특정 메소드의 트랜잭션 전파 속성만 PROPAGATION_NOT_SUPPORTED로 설정해서 트랜잭션 없이 동작하게 만들 수 있다.   

<br/>

### 4-1-1. getTransaction()으로 트랜잭션을 시작하는 이유

트랜잭션 매니저에서 트랜잭션을 시작하려 할 때 getTransaction() 메소드를 사용한다.    
트랜잭션 매니저의 getTransaction() 메소드는 항상 트랜잭션을 새로 시작하는 것이 아니다.    
트랜잭션 전파 속성과 현재 진행 중인 트랜잭션이 존재하는지 여부에 따라서 새로운 트랜잭션을 시작 하거나 이미 진행 중인 트랜잭션에 참여한다.    

## 4-2. 격리수준

서버 환경에서 여러 트랜잭션이 동시에 진행될 수 있다.   
이 때 격리수준으로 특정 트랜잭션이 다른 트랜잭션에서 변경하거나 조회하는 데이터를 볼 수 있게 허용할지 말지를 결정해, 가능한 한 많은 트랜잭션을 동시에 진행시키면서도 문제가 발생하지 않게 제어한다.   

<br/>

격리 수준에는 READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE 이 있다.

## 4-3. 제한시간
트랜잭션을 수행하는 timeout.    
DefaultTransactionDefinition의 기본 설정은 timeout 제한시간이 없다.   

## 4-4. 읽기전용

읽기전용으로 설저해두면 트랜잭션 내에서 데이터를 조작하는 시도를 막아줄 수 있다.   
DefaultTransactionDefinition를 사용하는 대신 트랜잭션 정의를 수정하려면,
TransactionDefinition 오브젝트를 DI 받아서 DefaultTransactionDefinition 대신 사용하도록 만들면 된다.

# 5. 트랜잭션 애노테이션

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

## 5-1. @TransactionalEventListener

Spring에서 @EventListener 애노테이션을 통해 이벤트가 발생 했을때 동작할 기능을 등록할 수 있다.    
그리고 트랜잭션에 관련된 이벤트가 발생 했을때 동작할 기능을 @TransactionalEventListener으로 등록할 수 있다.   
트랜잭션 관련 이벤트가 발생하는 시점은 아래 4가지 이다.

- BEFORE_COMMIT: 커밋이 되기 전
- AFTER_COMMIT: 커밋이 된 후
- AFTER_ROLLBACK: 롤백이 된 후
- AFTER_COMPLETION: 커밋 또는 롤백이 된 후

@EventListener 또는 @TransactionalEventListener 등록된 리스너는 동기적으로 실행되어 현재 실행 중인 스레드에서 동작한다.    
@Async 애노테이션을 적용해 별도의 스레드에서 비동기 적으로 동작하도록 할 수 있다.   

```java
@TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
public void createdOutbox(OutboxEvent outboxEvent) {
    log.info("[MessageRelay.createOutbox] outboxEvent={}", outboxEvent);
    outboxRepository.save(outboxEvent.getOutbox());
}

@Async("messageRelayPublishEventExecutor")
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void publishEvent(OutboxEvent outboxEvent) {
    publishEvent(outboxEvent.getOutbox());
}
```

# 6. Logging

Spring Boot는 apache Common Loggings를 내부 로깅 모듈로 사용한다.   
spring boot starter에서 기본 설정으로 Logback이 사용된다.   

## 6-1. Spring Log Format

Spring Boot의 기본 로깅 포맷은 아래와 같다.

```
2025-02-20T14:15:52.373Z  INFO 125657 --- [myapp] [           main] o.s.b.d.f.logexample.MyApplication       : Starting MyApplication using Java 17.0.14 with PID 125657 (/opt/apps/myapp.jar started by myuser in /opt/apps/)
2025-02-20T14:15:52.385Z  INFO 125657 --- [myapp] [           main] o.s.b.d.f.logexample.MyApplication       : No active profile set, falling back to 1 default profile: "default"
2025-02-20T14:15:55.401Z  INFO 125657 --- [myapp] [           main] o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat initialized with port 8080 (http)
2025-02-20T14:15:55.479Z  INFO 125657 --- [myapp] [           main] o.apache.catalina.core.StandardService   : Starting service [Tomcat]
```

- Date, Time
- Log Level: ERROR, WARN, INFO, DEBUF, TRACE
- Process ID
- '---' seperator
- Application name: spring.application.name 설정이 있는 경우 표기
- Application group: spring.application.group 설정이 있는 경우 표기
- Thread name
- Correlatoin ID: tracing이 허용된 경우 로깅(위 예시에는 없음)
- Logger name: 주로 약어 표기가 포함된 소스의 클래스 이름
- Log message

## 6-2. Slf4j
로깅 라이브러리는 Logback, Log4j2, Java Util Logging 등 다양하다.   
Slf4j는 다양한 로깅 라이브러리들을 같은 방식으로 사용할 수 있도록 인터페이스를 제공하는 파사드이다.   
애플리케이션은 Slf4j를 사용해 어떤 로깅 라이브러리를 사용해도 코드에서 같은 방법으로로깅을 할 수 있다.   
따라서 로깅 라이브러리를 교체해도 Slf4j 인터페이스에 맞춰 개발한 애플리케이션의 코드는 수정이 필요없다.   

<br/>

※ 만약 애플리케이션이 서블릿 컨테이너나 애플리케이션 서버에서 동작한다면, Java Util Logging API로 실행되는 로깅들은 애플리케이션 로그에 남지 않는다.   

<br/>

## 6-3. @Slf4j 애노테이션

Slf4j를 사용하기 위해 선언을 해줘야 하지만 @Slf4j 애노테이션을 사용하면 lombok에서 자동으로 선언해 준다.

```java
// @Slf4j 사용 전
public class Slf4jSample {
    private static final Logger log = LoggerFactory.getLogger(Slf4jSample.class);

    public static void main(String[] args) {
        log.info("logging");
    }
}
```

```java
// @Slf4j 사용
@Slf4j
public class Slf4jSample {
    public static void main(String[] args) {
        log.info("logging");
    }
}
```

# 7. LocalDateTime/Duration

## 7-1. LocalDateTime

### 7-1-1. LocalDateTime.now()
현재 로컬 컴퓨터의 날짜와 시간을 반환   

```java
// 2025-02-23T11:58:20.551705
LocalDateTime.now();
```

## 7-1-2. 비교
- isAfter(LocalDateTime): 인자보다 미래 시간이면 true 반환
- isBefore(LocalDateTime): 인자보다 과거 시간이면 true 반환
- isEqual(LocalDateTime): 인자와 같은 시간이면 true 반환
- compareTo(LocalDateTime)
    - > 0: 인자보다 미래 시간
    - < 0: 인자보다 과거 시간
    - == 0: 인자와 같은 시간

## 7-1-3. ofInstant(Instant, Zone)
java.time.Instant는 1740372254736과 같이 시간을 정수로 표기한 정보를 가진다.    
Date에서 LocalDateTime으로 바로 전환이 불가능 하므로 아래 코드와 같이 Instant를 활용해 변환한다.   
Instant.toEpochMilli() 의 반환 값인 epoch초는 1970년 1월 1일 표준 자바 epoch 시간 부터 측정된 값이다.   

```java
Date date = new Date();
LocalDateTime localDateTime = Instant.ofInstant(
    Instant.ofEpochMilli(date.getTime()),
    ZoneId.systemDefault()
);
```

## 7-2. Duration
시간 간격을 초와 나노초로 표현한다. 간격을 계산하는데 시, 분을 사용할 수 있다.   
시간 간격은 long 타입의 최대값 만큼 저장할 수 있다.    

**자주 사용하는 함수**

- Duration.ofSeconds(long seconds): 인자로 받은 크기 만큼의 초를 표현한다.
- Duration.plusSeconds(long secondsToAdd): 인자로 받은 크기 만큼의 초를 더한다.
- Duration.ofDays(long days): 인자로 받은 크기 만큼의 날을 표현한다. 하루는 24시간으로 계산한다.
- Duration.plusDays(long dayToAdd): 인자로 받은 크기 만큼의 날을 더한다. dayToAdd * 86400 한 값을 더한다.
- Duration.between(Temporal startInclusive, Temporal endExclusive): 시작 시간(startInclusive)과 끝 시간(endExclusive) 사이의 간격을 계산한다. Temporal은 LocalDateTime, Instant 객체를 주로 사용한다.

# 8. CountDownLatch

다른 스레드에서 동작 중인 작업들이 끝날 때 까지 하나 이상의 스레드가 기다리도록 해주는 동기화 도구이다.   
CountDownLatch는 세려는 값을 인자로 받아 초기화 된다.     
await() 함수는 countDown() 함수를 통해 현재 카운트가 0이 될 때 까지 blocking 하고 0이 되면 즉시 리턴한다.   
CounDownLatch의 카운트 값은 다시 초기화 될 수 없다.    
카운트를 초기화 해 여러 번 수행이 필요한 경우 CountDownLatch 대신 CyclicBarrier를 고려한다.   

<br/>

아래 코드는 N개의 작업자 스레드가 startSignal이 0이 될 때 까지 기다린 후 작업을 완료할 때 까지 main 함수가 동작하는 스레드가 기다리는 예제이다.
```java
class Driver { // ...
    void main() throws InterruptedException {
        CountDownLatch startSignal = new CountDownLatch(1);
        CountDownLatch doneSignal = new CountDownLatch(N);

    for (int i = 0; i < N; ++i) // create and start threads
        new Thread(new Worker(startSignal, doneSignal)).start();

        doSomethingElse();            // don't let run yet
        startSignal.countDown();      // let all threads proceed
        doSomethingElse();
        doneSignal.await();           // wait for all to finish
    }
}

class Worker implements Runnable {
    private final CountDownLatch startSignal;
    private final CountDownLatch doneSignal;
    Worker(CountDownLatch startSignal, CountDownLatch doneSignal) {
        this.startSignal = startSignal;
        this.doneSignal = doneSignal;
    }
    public void run() {
        try {
            startSignal.await();
            doWork();
            doneSignal.countDown();
        } catch (InterruptedException ex) {} // return;
    }

    void doWork() { ... }
 }
```

# 9. @Scheduled, @EnableScheduling

@Scheduled 애노테이션으로 주기적인 작업을 실행하기 위해 @Configuration 애노테이션이 등록된 클래스에 @EnableScheduiling 애노테이션을 추가해야 한다.   

```java
@EnableAsync
@Configuration
@ComponentScan("traffic.board.common.outboxmessagerelay")
@EnableScheduling
public class MessageRelayConfig {
    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;
...
```

@Scheduled 애노테이션이 붙은 메서드는 스프링 컨테이너가 주기적으로 실행한다.   
각 작업은 중복되어 실행되지 않고 하나의 작업만 실행된다.   
@Scheduled 애노테이션의 fixedDelay, fixedRate 속성을 통해 작업의 주기를 설정할 수 있다.   
fixedDelay 속성은 이전 작업이 종료되면 주어진 시간 만큼 기다린 후 다음 작업을 실행한다.
fixedRate 속성은 주어진 시간 만큼 기다린 후 다음 작업을 실행한다.    
만약 다음 작업을 실행하기 위해 기다린 시간 보다 작업에 수행된 시간이 더 오래 걸리는 경우,   
수행할 작업을 대기열에 보관하고 진행 중인 작업이 완료되면 바로 다음 작업을 실행한다.   
initialDelay 속성은 첫 작업이 실행하기 전에 기다릴 시간을 설정한다.   
아래 코드는 Redis에 접근해 데이터를 추가, 조회하는 작업을 이전 작업이 끝나고 3초 뒤에 실행한다.

```java
private final int PING_INTERVAL_SECONDS = 3;

@Scheduled(fixedDelay = PING_INTERVAL_SECONDS, timeUnit = TimeUnit.SECONDS)
public void ping() {
    redisTemplate.executePipelined((RedisCallback<?>) action -> {
        StringRedisConnection conn = (StringRedisConnection) action;
        String key = generateKey();
        conn.zAdd(key, Instant.now().toEpochMilli(), APP_ID);
        conn.zRemRangeByScore(
                key,
                Double.NEGATIVE_INFINITY,
                Instant.now().minusSeconds(PING_INTERVAL_SECONDS * PING_FAILURE_THRESHOLD).toEpochMilli()
        );
        return null;
    });
}
```

# 10. @Async, @EnableAsync

@Async 애노테이션으로 비동기 작업을 처리하기 위해 @Configuration 애노테이션이 등록된 클래스에 @EnableAsync 애노테이션을 추가해야 한다.   

```java
@EnableAsync
@Configuration
@ComponentScan("traffic.board.common.outboxmessagerelay")
@EnableScheduling
public class MessageRelayConfig {
    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;
...
```

메소드에 @Async 애노테이션을 추가해 비동기 적으로 작업을 처리할 수 있다.   
애노테이션이 붙은 메소드 Caller는 즉시 리턴을 받고 비동기 작업은 Spring TaskExecutor에 전달되어 실행된다.   
별도의 설정이 없는 경우 디폴트로 SimpleAsyncTaskExecutor를 사용해 비동기 작업을 수행한다.   
SimpleAsyncTaskExecutor는 실행될 때 마다 새로운 스레드를 생성해 사용하고 스레드를 재사용하지 않는다.    
보통 비동기 작업은 리턴 값이 없지만, 비동기 작업을 호출하는 명시적인 Caller가 있기 때문에 필요한 경우 Future 타입을 리턴해 Caller가 사용할 수 있다.   

```java
@Async
Future<String> returnSomething(int i) {
    // this will be run asynchronously
}
```

@Async 애노테이션을 통한 비동기 작업은 Spring AOP의 프록시를 통해 동작한다.    
@Async가 붙은 메소드를 프록시로 Wrapping 하고 Caller가 메소드를 호출할 때 실제로는 Wrapping된 프록시가 호출되어 비동기 작업을 수행하게 된다.   
따라서 @Async가 붙은 메소드가 접근 제한자로 private를 사용하면 프록시로 Wrapping 하지 못해 비동기로 작업을 실행할 수 없다.   
그리고 메소드가 등록된 클래스 내에서 자가 호출을 하면 Wrapping된 프록시를 거치지 않기 때문에 정상적으로 실행 되지 않는다.   
아래 코드에선 작업이 비동기적으로 수행되지 않고 publishEventInner1() 메소드가 실행된 후 publishEventInner2() 메소드가 동기적으로 실행된다.

```java
public class MessageRelay {
    pubilc void publishEvent() {
        this.publishEventInner1();
        this.publishEventInner2();
    }

    @Async
    public void publishEventInner1() {
        // this will be run asynchronously
    }

    @Async
    public void publishEventInner2() {
        // this will be run asynchronously
    }
}
```

비동기 작업을 실행하기 위한 TaskExecutor를 지정할 수 있다.   
아래 코드와 같이 별도의 스레드풀을 만들고 컨테이너에 빈으로 등록하고 @Async 애노테이션의 파라메터로 전달해 지정할 수 있다.   

```java
@EnableAsync
@Configuration
@ComponentScan("traffic.board.common.outboxmessagerelay")
@EnableScheduling
public class MessageRelayConfig {
    ...
    @Bean
    public Executor messageRelayPublishEventExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(20);
        executor.setMaxPoolSize(50);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("mr-pub-event-");
        return executor;
    }
    ...
}

@Async("messageRelayPublishEventExecutor")
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void publishEvent(OutboxEvent outboxEvent) {
    publishEvent(outboxEvent.getOutbox());
}
```

# 11. ApplicationEventPublisher

애플리케이션을 개발할 때 주요 비즈니스 로직과 부가적인 비즈니스 로직이 결합되어 코드가 복잡해지는 경우가 종종 발생한다.   
이 때 부가적인 비즈니스 로직은 이벤트로 처리하도록 개발해 관심사를 분리할 수 있다.   
예를 들어 게시글 등록 비즈니스 로직에는 게시글을 저장하는 주요 비즈니스 로직과 추가된 게시글의 캐싱 처리, 통계 처리와 같은 부가적인 비즈니스 로직이있다.    
게시글의 캐싱, 통계 처리는 게시글이 등록되었다는 이벤트가 발생 했을 때 처리 되도록 주요 비즈니스 로직과 분리해 개발할 수 있다.   

<br/>

스프링에서 이벤트는 ApplicationEventPublisher 객체를 통해 발행할 수 있다.   
ApplicationEventPublisher는 스프링 컨테이너에서 관리하는 빈이고 publishEvent() 메소드를 통해 이벤트를 전달할 수 있다.   
Spring 4.2 버전 이전에는 발행되는 Event 객체는 ApplicationEvent를 extends 해야 했지만,   
4.2 버전 부터는 모든 객체를 Event로 받는 publishEvent() 메서드가 추가되었다.   

<br/>

ApplicationEventPublisher에서 발급한 이벤트를 @EventLisetner 애노테이션이 적용된 메소드에서 처리할 수 있다.   
기본적으로 동기적으로 처리하기 때문에 이벤트를 발행한 스레드가 이벤트를 핸들링한 다음 그 이후의 코드를 실행한다.   
@Async 애노테이션을 같이 적용하면 이벤트 리스너를 비동기적으로 처리할수 있다.   

<br/>

@TransactionalEventListener는 @EventListener와 같이 이벤트를 처리하는 기능과 트랜잭션 관리하는 기능이 결합되어, 트랜잭션이 완료된 후에 발급된 이벤트를 처리하도록 동작한다.   
애노테이션의 속성으로 AFTER_COMMIT(default), AFTER_ROLLBACK, AFTER_COMPLETION, BEFORE_COMMIT을 갖는다.    
@EventLisetner가 적용된 핸들러는 트랜잭션과 상관 없이 이벤트가 발생하면 즉시 처리된다.   
@TransactionEventListener는 트랜잭션이 처리된 후에 이벤트를 처리하는데, 주로 데이테베이스 변경이 확정된 후에 후속 작업을 수행할 떄 사용한다.   

```java
@Service
@RequiredArgsConstructor
public class ArticleService {
    private final Snowflake snowflake = new Snowflake();
    private final ArticleRepository articleRepository;
    private final OutboxEventPublisher outboxEventPublisher;
    private final BoardArticleCountRepository boardArticleCountRepository;

    // 게시글 등록 요청을 처리하기 위한 서비스스
    // 트랜잭션 동기화를 위해 @Transactional 애노테이션 사용
    @Transactional
    public ArticleResponse create(ArticleCreateRequest request) {
        // 게시글을 데이터베이스에 등록하는 주요 비즈니스 로직
        Article article = articleRepository.save(
                Article.create(snowflake.nextId(), request.getTitle(), request.getContent(), request.getBoardId(), request.getWriterId())
        );
        int result = boardArticleCountRepository.increase(request.getBoardId());
        if (result == 0) {
            boardArticleCountRepository.save(
                    BoardArticleCount.init(request.getBoardId(), 1L)
            );
        }

        // 게시글 작성 이벤트 발급 요청
        outboxEventPublisher.publish(
                EventType.ARTICLE_CREATED,
                ArticleCreatedEventPayload.builder()
                        .articleId(article.getArticleId())
                        .title(article.getTitle())
                        .content(article.getContent())
                        .boardId(article.getBoardId())
                        .writerId(article.getWriterId())
                        .createdAt(article.getCreatedAt())
                        .modifiedAt(article.getModifiedAt())
                        .boardArticleCount(count(article.getBoardId()))
                        .build(),
                article.getBoardId()
        );

        return ArticleResponse.from(article);
    }
    ...
}

// 서비스의 메소드에서 요청한 이벤트 발행을 처리
@Component
@RequiredArgsConstructor
public class OutboxEventPublisher {
    private final Snowflake outboxIdSnowflake = new Snowflake();
    private final Snowflake eventIdSnowflake = new Snowflake();
    private final ApplicationEventPublisher applicationEventPublisher;

    public void publish(EventType type, EventPayload payload, Long sharedKey) {
        Outbox outbox = Outbox.create(
                outboxIdSnowflake.nextId(),
                type,
                Event.of(
                        eventIdSnowflake.nextId(), type, payload
                ).toJson(),
                sharedKey & MessageRelayConstants.SHARD_COUNT
        );
        // Spring 이벤트 발행
        applicationEventPublisher.publishEvent(OutboxEvent.of(outbox));
    }
}

// Spring 이벤트 핸들러
@Slf4j
@Component
@RequiredArgsConstructor
public class MessageRelay {
    private final OutboxRepository outboxRepository;
    private final MessageRelayCoordinator messageRelayCoordinator;
    private final KafkaTemplate<String, String> messageRelayKafkaTemplate;

    ...

    // 발급한 이벤트를 비동기적으로 핸들링
    // 트랜잭션이 커밋된 다음 이벤트를 처리함
    @Async("messageRelayPublishEventExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void publishEvent(OutboxEvent outboxEvent) {
        publishEvent(outboxEvent.getOutbox());
    }

    private void publishEvent(Outbox outbox) {
        try {
            messageRelayKafkaTemplate.send(
                    outbox.getEventType().getTopic(),
                    String.valueOf(outbox.getShardKey()),
                    outbox.getPayload()
            ).get(1, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.error("[MessageRelay.publishEvent] outbox={}", outbox, e);
            throw new RuntimeException(e);
        }
        outboxRepository.delete(outbox);
    }
    ...
}
```

# 12. Optional\<T\>

코드 작성 중 null 값을 가지는 경우를 처리하기 위해 번거로운 조건문 코드를 작성하는 일이 종종 생긴다.   
그리고 NullPointExeption이 발생해 기능이 정상적으로 동작하지 않는 경우가 종종 발생한다.   
Java 8 이후로 null을 가질 수 있는 값을 감싸는 wrapper 클래스인 Optional\<T\>을 지원해 이런 문제들을 해결한다.   


- empty() : 빈 값을 가지는 Optional 인스턴스를 반환한다.
```java
Optional.empty()
```

- equals(Object obj) : obj를 갖는지 확인한다.

- filter(Predicate<? super T> predicate) : 값이 존재하고 주어진 Predicate와 일치하면 값을 갖는 Optional을 반환하고 아니면 비어있는 Optional을 반환한다.
```java
commentRepository.indById(parentCommentId).filter(not(Comment::getDeleted))
```

- get() : Optional에 값이 있으면 값을 리턴하고 아니면 NoSuchElementException 예외를 던진다.

- ifPresent(Consumer<? super T> consumer): 값이 존재하면 전달된 Consumer를 실행하고 없으면 아무 일도 하지 않는다.
```java
commentRepository.findById(commentId)
                .filter(not(Comment::getDeleted))
                .ifPresent(comment -> {
                    if (hasChildren(comment)) {
                        comment.delete();
                    } else {
                        delete(comment);
                    }
                })
```

- isPresent() : 값이 있으면 true를 반환하고 없으면 false를 반환한다.

- map(Function<? super T,? extends U> mapper) : 값이 있으면 제공된 매핑 함수를 해당 값에 적용하고, 결과가 null이 아니면 결과를 설명하는 Optional을 반환한다.
```java
@Getter
@ToString
public class ArticleLikeResponse {
    ...

    public static ArticleLikeResponse from(ArticleLike articleLike) {
        ArticleLikeResponse response = new ArticleLikeResponse();
        ...
        return response;
    }
}

articleLikeRepository.findByArticleIdAndUserId(articleId, userId)
                .map(ArticleLikeResponse::from)
                .orElseThrow();
```

- of(T value) : null이 아닌 값을 갖는 Optional을 반환한다

- ofNullable(T value) : null이 아니면 지정된 값을 갖는 Optional을 반환하고, 그렇지 않으면 빈 Optional을 반환한다.
```java
Optional.ofNullable(articleResponse);
```

- orElse(T other) : 값이 있으면 반환하고 그렇지 않으면 other를 반환한다.
```java
articleLikeCountRepository.findById(articleId)
                .map(ArticleLikeCount::getLikeCount)
                .orElse(0L);
```

- orElseGet(Supplier<? extends T> other) : 값이 있으면 반환하고 그렇지 않으면 Supplier other의 결과를 반환한다.
```java
ArticleLikeCount articleLikeCount = articleLikeCountRepository.findLockedByArticleId(articleId)
                .orElseGet(() -> ArticleLikeCount.init(articleId, 0L));
```

- orElseThrow(Supplier<? extends X> exceptionSupplier) : 값이 있으면 반환하고 없으면 예외를 던진다
```java
ArticleResponse.from(articleRepository.findById(articleId).orElseThrow());
```

# 13. Predicate
인자를 받아 boolean 값을 반환하는 함수형 인터페이스이다.

- test(T t) : 주어진 인자를 검증한다

- and(Predicate<? super T> other) : 다른 Predicate와 AND 조건으로 연결한다.

- or(Predicate<? super T> other) : 다른 Predicate와 OR 조건으로 연결한다.

- Predicate<T> not(Predicate<? super T> target) : 

```java
private boolean hasChildren(Comment comment) {
        return commentRepository.countBy(comment.getArticleId(), comment.getCommentId(), 2L) == 2;
    }

public void delete(Comment comment) {
    commentRepository.delete(comment);
    if (!comment.isRoot()) {
        commentRepository.findById(comment.getParentCommentId())
                .filter(Comment::getDeleted)
                .filter(Predicate.not(this::hasChildren))
                .ifPresent(this::delete);
    }
}
```

# 14. JPA

JPA는 자바의 표준 ORM(Object Relational Mapping)으로서 객체와 DB를 매핑한다.   

## 14-1. Persistence Unit
Persistence Unit은 데이터베이스를 연결을 위한 설정이다. url, 사용자 이름, 비밀번호 등의 속성을 갖고서 DB와 연결하고 커넥션풀과 같은 연결을 관리한다.

```yml
spring:
  application:
    name: traffic-board-article-service
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: jdbc:mysql://127.0.0.1:3306/article
    username: root
    password: root
```

## 14-2. Configuration

```java
@EntityScan(basePackages = "traffic.board")
@SpringBootApplication
@EnableJpaRepositories(basePackages = "traffic.board")
public class ArticleApplication {
    public static void main(String[] args) {
        SpringApplication.run(ArticleApplication.class, args);
    }
}
```

### 14-2-1. @EnableJpaRepositories
JpaRepository를 implement하는 인터페이스나 클래스를 자동으로 빈으로 등록한다.   
basePackage 속성이 없으면 디폴트로 @SpringBootApplication에 설정한 빈 스캔 범위와 같은 범위에서 스캔한다.   
@SpringBootApplication에 @EnableJpaRepositories 애노테이션이 자동으로 설정되어 있다.   

### 14-2-2. @EntityScan
Entity 클래스들을 스캔해 자동으로 등록할 base package를 설정한다.

## 14-3. JpaRepository

JPA를 사용해 데이터베이스를 조작하기 위한 메소드들을 제공하는 인터페이스이다.   
도메인 클래스와 도메인 클래스의 식별자 유형을 인자로 사용한다.    
JpaRepository는 CrudRepository를 상속 받는다.   
CrudRepository는 엔티티의 생성, 조회, 수정, 삭제와 관련된 메소드를 지원하고 JpaRepository는 CrudRepository의 기능에 페이징 기능을 추가했다.   

<br/>

@Query 애노테이션을 사용하면 메소드를 호출해 실행할 정적 쿼리를 작성할 수 있다.   
@Param 애노테이션으로 메서들에 들어오는 파라메터를 쿼리에서 사용할 지정할 수 있다.   

```java
@Repository
public interface ArticleRepository extends JpaRepository<Article, Long> {
    @Query(
            value = "select article.article_id, article.title, article.content, article.board_id, article.writer_id, " +
                    "article.created_at, article.modified_at " +
                    "from (" +
                    "   select article_id from article " +
                    "   where board_id = :boardId " +
                    "   order by article_id desc " +
                    "   limit :limit offset :offset " +
                    ") t left join article on t.article_id = article.article_id ",
            nativeQuery = true
    )
    List<Article> findAll(
            @Param("boardId") Long boardId,
            @Param("offset") Long offset,
            @Param("limit") Long limit
    );
    ...
}

@Table(name = "article")
@Getter
@Entity
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Article {
    @Id
    private Long articleId;
    private String title;
    private String content;
    private Long boardId;
    private Long writerId;
    private LocalDateTime createdAt;
    private LocalDateTime modifiedAt;

    ...
}
```

### 14-3-1. @Modifying

@Modifying 애노테이션은 @Query 애노테이션으로 작성된 INSERT, UPDATE, DELETE 쿼리에서 사용된다.   
데이터를 수정하는 쿼리 이므로 쓰기 지연 되지 않고 실행 되어야 하는 쿼리임을 나타낸다.
JpaRepository에서 제공하는 메서드에는 적용되지 않는다.   

```java
@Repository
public interface ArticleCommentCountRepository extends JpaRepository<ArticleCommentCount, Long> {
    @Query(
            value = "update article_comment_count set comment_count = comment_count + 1 where article_id = :articleId",
            nativeQuery = true
    )
    @Modifying
    int increase(@Param("articleId") Long articleId);
    ...
}
```

@Modifying 애노테이션은 아래와 같이 정의되어 있다.   
@Query 애노테이션으로 정의한 UPDATE, INSERT, DELETE 쿼리를 실행하면 flushAutomatically()로 인해 쿼리가 바로 실행된다.   
default 값이 false로 되어 있지만 더 상위의 Hibernate default 설정에 AUTO로 설정되어 있어 쿼리가 바로 실행된다.   

<br/>

UPDATE, INSERT, DELETE 쿼리를 실행한 다음 수정한 레코드를 JpaRepository를 통해 조회하면 실제 DB에는 반영 되었지만 조회 결과는 이전 값이 조회되는 경우가 있다.   
레코드를 수정한 쿼리의 트랜잭션이 끝나지 않고 조회해서 Entity가 Persistence Context에서 관리되고 있는 경우 발생한다.   
이 경우 clearAutomatically=true 속성을 추가하면 @Query로 정의된 쿼리를 처리한 다음 Persistence Context에서 관리되는 Entity를 clear 해주기 때문에    
수정된 값을 조회할 수 있다.   

```java
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.METHOD, ElementType.ANNOTATION_TYPE})
@Documented
public @interface Modifying {
    boolean flushAutomatically() default false;

    boolean clearAutomatically() default false;
}
```

## 14-4. EntityManager
EntityManager는 Entity를 관리하고 Persistence Context는 Entity를 관리하는 공간이다.   
EntityManager는 Persistence Context에 대한 작업을 수행해 자바 프로그램과 데이터베이스를 연결한다.   

### 14-4-1. Persistence Context
Persistence Context를 사용해 1차 캐시, 쓰기 지연, 변경 감지를 지원한다.   
Persistence Context를 통해 DB 접근을 최소화 하고 효울적으로 ORM을 할 수 있다.   

#### 14-4-1-1. 1차 캐시
Entity 인스턴스와 식별자를 맵 형태로 저장해 DB에 직접 접근하는 횟수를 줄인다.    

#### 14-4-1-2. 쓰기 지연
Entity 인스턴스에 대한 쿼리를 바로 DB로 보내지 않고 1차 캐시에 반영하고 쿼리는 쓰기 지연 저장소에 저장한다.   
1차 캐시와 DB 사이에 동기화(flush)를 시킬 때 모아둔 쿼리를 한 번에 DB에 보낸다.   

#### 14-4-1-3. 변경 감지
JPA는 Entity 인스턴스가 Persistence Context에 처음 등록될 때 그 상태(스냅샷)를 저장한다.   
flush를 하기 전 스냅샷과 현재 상태를 비교해서 UPDATE 쿼리를 쓰기 지연 저장소에 추가한다.   
Entity 인스턴스의 속성이 비즈니스 로직을 수행하며 변경되면 자동으로 바뀐 내용을 DB와 동기화 한다.   

### 14-4-2. Entity States
Entity는 아래 네 가지 상태를 가질 수 있다.   

- 비영속: 객체가 생성 되었지만 Persistence Context에 관리되지 않는 상태. 일반적인 자바 객체
- 영속: Persistence Context에 저장되에 관리되는 상태. 1차 캐시, 쓰기 지연, 변경 감지 지원
- 준영속: Persistence Context에서 분리된 상태. 트랜잭션을 커밋하면 영속성 컨텍스트가 닫히고 준영속 상태가 된다.
- 삭제: 삭제하기로 표시된 상태. 다음 동기화(flush) 작업 때 DELETE 쿼리가 쓰기 지연 저장소에 저장된다.

비영속 상태에 있는 Entity는 트랜잭션이 시작되면 Persistence Context에 저장되어 영속 상태로 변한다.   
그리고 트랜잭션이 완료되면 Entity는 Persistence Context와 분리되어 준영속 상태가 된다.   

## 14-5. Entity
Entity는 POJO이고 Hibernate와 같은 JPA 구현체의 persistence 도메인 객체이다.    
일반적으로 Entity는 관계형 데이터베이스의 테이블을 나타내고 Entity 인스턴스는 해당 테이블의 행에 해당한다.    
Entity의 속성은 ORM 애노테이션을 사용해 관계형 데이터베이스에 매핑한다.   
애노테이션은 두 가지로 나눌 수 있는데, 객체 모델, 두 엔티티간의 관계 설명 등 논리적 매핑 애노테이션과   
물리적 스키마, 테이블, 컬럼, 인덱스 등 물리적 매핑 애노테이션으로 나눌 수 있다.

```java
@Table(name = "outbox")
@Getter
@Entity
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Outbox {
    @Id
    private Long outboxId;
    @Enumerated(EnumType.STRING)
    private EventType eventType;
    private String payload;
    private Long shardKey;
    private LocalDateTime createdAt;

    public static Outbox create(Long outboxId, EventType eventType, String payload, Long shardKey) {
        Outbox outbox = new Outbox();
        outbox.outboxId = outboxId;
        outbox.eventType = eventType;
        outbox.payload = payload;
        outbox.shardKey = shardKey;
        outbox.createdAt = LocalDateTime.now();
        return outbox;
    }
}
```

### 14-4-1. @Entity/@Table/@Id

@Entity 애노테이션을 사용해 persistence POJO(클래스)를 Entity로 선언할 수 있다.   
@Id 애노테이션은 Entity의 식별자를 선언한다.   
@Table 애노테이션은 클래스에 달 수 있고 Entity가 매핑할 테이블, 카탈로그, 스키마 이름을 정의하는데 사용된다.   
그리고 @Enumerated 애노테이션으로 Java enum 타입을 매핑할 수 있다.

### 14-4-2. @Lock/@Version


### 14-4-3. @NoArgsConstructor(access = AccessLevel.PROTECTED)

@NoArgsConstructor(access = AccessLevel.PROTECTED) 애노테이션은 파라메터가 없는 디폴트 생성자를 생성하고 protected로 접근 제한을 설정한다.    
Entity에 이 애노테이션을 등록하는 이유는 JPA가 Entity를 위해 Proxy 객체를 생성하기 때문이다.     
JPA는 Entity의 Proxy 객체를 통해 접근하고 Proxy 객체를 통해 1차 캐시, 쓰기 지연, 변경 감지 등의 기능을 지원한다.   

# 15. Spring Data Redis

## 15-1. RedisConnection, RedisConnectionFactory

RedisConnection을 사용해 Java 애플리케이션과 Redis를 연결한다.   
RedisConnectionFactory는 RedisConnection을 만들고 Spring DataAccessException 계층 예외로 번역하는 PersistenceExceptionTranslator 역할을 수행한다.   
아래와 같이 Lettuce나 Jedis Connection Factory를 빈으로 추가해 Redis와의 연결을 만들 수 있다.   

```java
@Configuration
class AppConfig {

    @Beanpublic LettuceConnectionFacory LettuceConnectionFacory() {
        LettuceClientConfiguration clientConfig = LettuceClientConfiguration.builder()
                .useSsl().and()
                .commandTimeout(Duration.ofSeconds(2))
                .shutdownTimeout(Duration.ZERO)
                .build();
        return new LettuceConnectionFactory(new RedisStandaloneConfiguration("localhost", 6379), clientConfig);
    }
}
```

Spring boot는 Redis에 대해 auto configuration이 되어 있어 application.propierties나 application.yml에 설정만 하면 Redis와 통신할 수 있다.    
Redis 연결 뿐만 아니라 Redis 데이터를 다루는 다양한 기능을 제공하는 헬퍼 클래스인 RedisTemplate를 빈으로 자동으로 생성하므로 간단히 주입을 받아 사용할 수 있다.   
Redis 연결을 위한 설정은 아래와 같다.   

```yml
server.port: 9004
spring:
  application:
    name: traffic-board-hot-article-service
  data:
    redis:
      host: 127.0.0.1
      port: 6379
...
```

## 15-2. RedisTemplate
RedisTemplate는 Redis 데이터를 다루는 다양한 기능을 제공하는 헬퍼 클래스이다.    
자바 객체와 레디스 데이터 사이의 직렬화/역직렬화를 지원한다. 직렬화/역직렬화는 default로 JdkSerializationRedisSerializer를 사용하고 변경 가능하다.   
그리고 RedisTemplate는 thread-safe 하다.    
데이터를 문자열 위주로 다룬다면 StringRedisTemplate를 사용할 수 있다.   
Spring boot에선 아래와 같이 주입을 받아 사용할 수 있다.

```java
@Repository
@RequiredArgsConstructor
public class ArticleViewCountRepository {
    private final StringRedisTemplate redisTemplate;

    // view::article::{article_id}::view_count
    private static final String KEY_FORMAT = "view::article::%s::view_count";

    public Long read(long articleId) {
        String result = redisTemplate.opsForValue().get(generateKey(articleId));
        return result == null ? 0L : Long.valueOf(result);
    }
    ...
}
```

RedisTemplate에서 데이터를 다루기 위해 아래 메소드들을 주로 사용한다.

### 15-2-1. RedisTemplate.opsForValue()

```java
public ValueOperations<K, V> opsForValue()
```

```java
@Repository
@RequiredArgsConstructor
public class ArticleLikeCountRepository {
    private final StringRedisTemplate redisTemplate;
    ...

    public Long read(Long articleId) {
        String result =  redisTemplate.opsForValue().get(generateKey(articleId));
        return result == null ? 0L : Long.valueOf(result);
    }
    ...
```

Simple value(Redis의 String)에 대한 Redis operation(ValueOperations)을 반환한다.    
ValueOperation에서 주로 사용하는 메서드는 아래와 같다.   
setIfAbsent 메소드는 원자적으로 동작한다.    

|Modifier and Type|Method|Description|
|:---|:---|:---|
|V|get(Object key)|"key"에 해당하는 값을 가져온다|
|void|set(K key, V value)|"key"에 "value"를 저장한다|
|Long|increment(K key)|"key"로 가져온 정수 값에 1을 더하고 문자열로 저장한다|
|Boolean|setIfAbsent(K key, V value, Duration timeout)|"key"에 해당하는 값이 없거나 "timeout"이 지나 만료되면 value를 저장한다|
|Boolean|setIfPresent(K key, V value)|"key"에 해당하는 값이 있으면 "value"를 저장한다|

### 15-2-2. RedisTemplate.opsForZSet()

```java
public ZSetOperations<K, V> opsForZSet()
```

```java
@Repository
@RequiredArgsConstructor
public class ArticleIdListRepository {
    private final StringRedisTemplate redisTemplate;

    // article-read::board::{boardId}::article-list
    private static final String KEY_FORMAT = "article-read::board::%s::article-list";

    ...

    public void delete(Long boardId, Long articleId) {
        redisTemplate.opsForZSet().remove(generateKey(boardId), toPaddedString(articleId));
    }

    public List<Long> readAll(Long boardId, Long offset, Long limit) {
        return redisTemplate.opsForZSet()
                .reverseRange(generateKey(boardId), offset, offset + limit -1)
                .stream().map(Long::valueOf).toList();
    }

    public List<Long> readAllInfiniteScroll(Long boardId, Long lastArticleId, Long limit) {
        return redisTemplate.opsForZSet().reverseRangeByLex(
                generateKey(boardId),
                lastArticleId == null ?
                        Range.unbounded() :
                        Range.leftUnbounded(Range.Bound.exclusive(toPaddedString(lastArticleId))),
                Limit.limit().count(limit.intValue())
        ).stream().map(Long::valueOf).toList();
    }
    ...
}

@Slf4j
@Repository
@RequiredArgsConstructor
public class HotArticleListRepository {
    private final StringRedisTemplate redisTemplate;

    // hot-article::list::{yyyyMMdd}
    private static final String KEY_FORMAT = "hot-article::list::%s";

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd");

    ...

    public List<Long> readAll(String dateStr) {
        return redisTemplate.opsForZSet()
                .reverseRangeWithScores(generateKey(dateStr), 0, -1).stream()
                .peek(tuple ->
                        log.info("[HotArticleListRepository.readAll] articleId={}, score={}", tuple.getValue(), tuple.getScore()))
                .map(ZSetOperations.TypedTuple::getValue)
                .map(Long::valueOf)
                .toList();
    }
}
```

zset에 대한 Redis Operation(ZSetOperations)을 반환한다.   
Redis의 Sorted Set(zset) 자료 구조는 하나의 key에 여러 개의 score와 value로 구성된다.
ZSetOperations에서 주로 사용하는 메서드는 아래와 같다.   

|Modifier and Type|Method|Description|
|:---|:---|:---|
|Long|remove(K key, Object ... values)|"key"에 해당하는 값에서 values 들을 지운다|
|Set<V>|reverseRange(K key, long start, long end)|"key"에 해당하는 값에서 내림차순 순서로 start에서 end까지 해당하는 값을 가져온다|
|Set<V>|reverseRangeByLex(K key, Range<String> range)|Range.getLowerBound()와 Range.getUpperBound() 사이의 값을 가진 key에서 zset의 역방향 사전식 순서로 모든 요소를 가져온다|
|Set<ZSetOperations.TypedTuple<V>>|reverseRangeWithScores(K key, long start, long end)|start 에서 end 범위 내의 튜플 집합을 내림차순으로 정렬하여 가져온다.|

### 15-2-3. RedisTemplate.executePipelined(RedisCallback<?> action)

Redis는 응답을 기다리지 않고 여러 요청을 Redis에 요청을 보내고 한번에 응답을 받는 파이프라인을 지원한다.   
여러 요청을 연속으로 보내야할 때 주로 사용한다.   

```java
@Repository
@RequiredArgsConstructor
public class ArticleIdListRepository {
    private final StringRedisTemplate redisTemplate;

    // article-read::board::{boardId}::article-list
    private static final String KEY_FORMAT = "article-read::board::%s::article-list";

    public void add(Long boardId, Long articleId, Long limit) {
        redisTemplate.executePipelined((RedisCallback<?>) action -> {
            StringRedisConnection conn = (StringRedisConnection) action;
            String key = generateKey(boardId);
            conn.zAdd(key, 0, toPaddedString(articleId));
            conn.zRemRange(key, 0, - limit - 1);
            return null;
        });
    }
    ...
}
```

# 16. Spring Data Kafka

Spring은 카프카에 메시지를 보내기 위해 KafkaTemplate를 제공한다.
그리고 카프카 메시지를 다루기 위해 KafkaMessageListenerContainer와 @KafkaListener를 제공한다.

## 16-1. KafkaTemplate



## 16-2. KafkaMessageListenerContainer

## 16-3. @KafkaListener