---
layout: post
title: HTTP 서버 활용 - 회원 관리 서비스
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

<MessageConverter 구현체>

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
