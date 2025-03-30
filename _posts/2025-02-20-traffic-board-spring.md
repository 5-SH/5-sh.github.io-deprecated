---
layout: post
title: 대규모 시스템으로 설계된 게시판에 사용된 Spring 문법과 요소 기술 - Spring
date: 2025-03-21 23:00:00 + 0900
categories: Traffic
ref: java, Spring, board
---

### 강의 : [스프링부트로 대규모 시스템 설계 - 게시판](https://www.inflearn.com/course/%EC%8A%A4%ED%94%84%EB%A7%81%EB%B6%80%ED%8A%B8%EB%A1%9C-%EB%8C%80%EA%B7%9C%EB%AA%A8-%EC%8B%9C%EC%8A%A4%ED%85%9C%EC%84%A4%EA%B3%84-%EA%B2%8C%EC%8B%9C%ED%8C%90/dashboard)

# 대규모 시스템으로 설계된 게시판에 사용된 Spring 문법과 요소 기술 - Spring

# 1. RestClient를 사용해 서버에 요청/응답 받고 서버의 Controller에서 요청 파라메터를 처리하는 방법

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

# 3. Logging

Spring Boot는 apache Common Loggings를 내부 로깅 모듈로 사용한다.   
spring boot starter에서 기본 설정으로 Logback이 사용된다.   

## 3-1. Spring Log Format

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

## 3-2. Slf4j
로깅 라이브러리는 Logback, Log4j2, Java Util Logging 등 다양하다.   
Slf4j는 다양한 로깅 라이브러리들을 같은 방식으로 사용할 수 있도록 인터페이스를 제공하는 파사드이다.   
애플리케이션은 Slf4j를 사용해 어떤 로깅 라이브러리를 사용해도 코드에서 같은 방법으로로깅을 할 수 있다.   
따라서 로깅 라이브러리를 교체해도 Slf4j 인터페이스에 맞춰 개발한 애플리케이션의 코드는 수정이 필요없다.   

<br/>

※ 만약 애플리케이션이 서블릿 컨테이너나 애플리케이션 서버에서 동작한다면, Java Util Logging API로 실행되는 로깅들은 애플리케이션 로그에 남지 않는다.   

<br/>

## 3-3. @Slf4j 애노테이션

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

# 4. @Scheduled, @EnableScheduling

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

# 5. @Async, @EnableAsync

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

# 6. ApplicationEventPublisher

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
그리고 트랜잭션에 관련된 이벤트가 발생 했을때 동작할 기능을 @TransactionalEventListener으로 등록할 수 있다.   
애노테이션의 속성으로 AFTER_COMMIT(default), AFTER_ROLLBACK, AFTER_COMPLETION, BEFORE_COMMIT을 갖는다.    
이 속성은 트랜잭션 관련 이벤트가 발생하는 시점이고 아래 4가지 이다.   

- BEFORE_COMMIT: 커밋이 되기 전
- AFTER_COMMIT: 커밋이 된 후
- AFTER_ROLLBACK: 롤백이 된 후
- AFTER_COMPLETION: 커밋 또는 롤백이 된 후

@EventLisetner가 적용된 핸들러는 트랜잭션과 상관 없이 이벤트가 발생하면 즉시 처리된다.   
@TransactionEventListener는 트랜잭션이 처리된 후에 이벤트를 처리하는데, 주로 데이테베이스 변경이 확정된 후에 후속 작업을 수행할 떄 사용한다.   
@EventListener 또는 @TransactionalEventListener 등록된 리스너는 동기적으로 실행되어 현재 실행 중인 스레드에서 동작한다.    
@Async 애노테이션을 적용해 별도의 스레드에서 비동기 적으로 동작하도록 할 수 있다.    

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
