---
layout: post
title:  대규모 시스템으로 설계된 게시판에 사용된 Spring 문법과 요소 기술들
date: 2025-02-20 13:00:00 + 0900
categories: Java, Spring
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
   
HttpMessageConverter는 자주 사용하는 설정이 등록되어 있다.   
예를 들어 자동으로 Object를 JSON 또는 XML로 변환한다. 그리고 문자열은 기본적으로 UTF-8로 인코딩 된다.   

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
컨테이너가 타입이나 이름을 기준으로 주입될 빈을 찾아준다. 컨테이너가 자동으로 주입할 빈을 결정하기 어려운 경우 직접 프로퍼티에 주입할 대상을 지정할 수 있다.   

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

@Repository 애노테이션은 데이터 액세스 서비스를 제공하는 클래스를 자동 빈 등록 대상으로 만들 때 사용한다.   
@Service 애노테이션은 비즈니스 로직을 담고 있는 서비스 계층의 빈을 자동 등록 대상으로 만들 때 사용한다.   

# 3. 트랜잭션 경계 설정
트랜잭션의 시작 선언(setAutoCommiot(false))하고 트랜잭션을 종료하는 하는 작업(commit(), rollback())을 트랜잭션 경계 설정이라 한다.   
transaction 경계 설정은 Connection을 열고 사용한 뒤 닫는 사이에서 일어난다.   
Service 계층에서 트랜잭션 경계를 설정하는 작업을 하고 쿼리 실행을 위해 DAO에 Connection을 전달해야 한다.   
   
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
- dao.update()를 호출하면(3) DAO는 트랜잭션 동기화 저장소에서 Connection을 가져오고(4) Connectio을 사용해 쿼리를 실행한다(5)
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