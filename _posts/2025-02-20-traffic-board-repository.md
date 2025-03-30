---
layout: post
title: 대규모 시스템으로 설계된 게시판에 사용된 Spring 문법과 요소 기술 - Repository
date: 2025-03-24 23:00:00 + 0900
categories: Traffic
ref: java, Spring, board
---

### 강의 : [스프링부트로 대규모 시스템 설계 - 게시판](https://www.inflearn.com/course/%EC%8A%A4%ED%94%84%EB%A7%81%EB%B6%80%ED%8A%B8%EB%A1%9C-%EB%8C%80%EA%B7%9C%EB%AA%A8-%EC%8B%9C%EC%8A%A4%ED%85%9C%EC%84%A4%EA%B3%84-%EA%B2%8C%EC%8B%9C%ED%8C%90/dashboard)

# 대규모 시스템으로 설계된 게시판에 사용된 Spring 문법과 요소 기술 - Repository

# 1. JPA

JPA는 자바의 표준 ORM(Object Relational Mapping)으로서 객체와 DB를 매핑한다.   

## 1-1. Persistence Unit
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

## 1-2. Configuration

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

### 1-2-1. @EnableJpaRepositories
JpaRepository를 implement하는 인터페이스나 클래스를 자동으로 빈으로 등록한다.   
basePackage 속성이 없으면 디폴트로 @SpringBootApplication에 설정한 빈 스캔 범위와 같은 범위에서 스캔한다.   
@SpringBootApplication에 @EnableJpaRepositories 애노테이션이 자동으로 설정되어 있다.   

### 1-2-2. @EntityScan
Entity 클래스들을 스캔해 자동으로 등록할 base package를 설정한다.

## 1-3. JpaRepository

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

### 1-3-1. @Modifying

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

## 1-4. EntityManager
EntityManager는 Entity를 관리하고 Persistence Context는 Entity를 관리하는 공간이다.   
EntityManager는 Persistence Context에 대한 작업을 수행해 자바 프로그램과 데이터베이스를 연결한다.   

### 1-4-1. Persistence Context
Persistence Context를 사용해 1차 캐시, 쓰기 지연, 변경 감지를 지원한다.   
Persistence Context를 통해 DB 접근을 최소화 하고 효울적으로 ORM을 할 수 있다.   

#### 1-4-1-1. 1차 캐시
Entity 인스턴스와 식별자를 맵 형태로 저장해 DB에 직접 접근하는 횟수를 줄인다.    

#### 1-4-1-2. 쓰기 지연
Entity 인스턴스에 대한 쿼리를 바로 DB로 보내지 않고 1차 캐시에 반영하고 쿼리는 쓰기 지연 저장소에 저장한다.   
1차 캐시와 DB 사이에 동기화(flush)를 시킬 때 모아둔 쿼리를 한 번에 DB에 보낸다.   

#### 1-4-1-3. 변경 감지
JPA는 Entity 인스턴스가 Persistence Context에 처음 등록될 때 그 상태(스냅샷)를 저장한다.   
flush를 하기 전 스냅샷과 현재 상태를 비교해서 UPDATE 쿼리를 쓰기 지연 저장소에 추가한다.   
Entity 인스턴스의 속성이 비즈니스 로직을 수행하며 변경되면 자동으로 바뀐 내용을 DB와 동기화 한다.   

### 1-4-2. Entity States
Entity는 아래 네 가지 상태를 가질 수 있다.   

- 비영속: 객체가 생성 되었지만 Persistence Context에 관리되지 않는 상태. 일반적인 자바 객체
- 영속: Persistence Context에 저장되에 관리되는 상태. 1차 캐시, 쓰기 지연, 변경 감지 지원
- 준영속: Persistence Context에서 분리된 상태. 트랜잭션을 커밋하면 영속성 컨텍스트가 닫히고 준영속 상태가 된다.
- 삭제: 삭제하기로 표시된 상태. 다음 동기화(flush) 작업 때 DELETE 쿼리가 쓰기 지연 저장소에 저장된다.

비영속 상태에 있는 Entity는 트랜잭션이 시작되면 Persistence Context에 저장되어 영속 상태로 변한다.   
그리고 트랜잭션이 완료되면 Entity는 Persistence Context와 분리되어 준영속 상태가 된다.   

## 1-5. Entity
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

### 1-4-1. @Entity/@Table/@Id

@Entity 애노테이션을 사용해 persistence POJO(클래스)를 Entity로 선언할 수 있다.   
@Id 애노테이션은 Entity의 식별자를 선언한다.   
@Table 애노테이션은 클래스에 달 수 있고 Entity가 매핑할 테이블, 카탈로그, 스키마 이름을 정의하는데 사용된다.   
그리고 @Enumerated 애노테이션으로 Java enum 타입을 매핑할 수 있다.

### 1-4-2. @Lock/@Version

하나의 값을 여러 스레드에서 동시 수정할 때 수정 사항이 제대로 반영되지 않는 동시성 문제를 해결하기 위해 비관적 락이나 낙관적 락을 사용할 수 있다.    

#### 1-4-2-1. 비관적 락

비관적 락은 동시성 문제가 발생할 것으로 가정하고 RDBMS에서 수정하려는 레코드에 쓰기 잠금을 걸어 동시에 들어온 다른 요청은 락을 점유한 요청이 수정을 완료할 때 까지 기다리게 된다.   
MySQL에서 UPDATE 쿼리를 실행할 때 수정되는 레코드에 쓰기 잠금이 걸리게 된다.    
또는 SELECT... FOR UPDATE 구문을 사용해 명시적으로 레코드에 쓰기 잠금을 걸 수 있다.   
Spring JPA에선 @Lock 애노테이션을 사용해 비관적 락을 설정할 수 있다.   

```java
@Repository
public interface ArticleLikeCountRepository extends JpaRepository<ArticleLikeCount, Long> {

    // select ... for update
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<ArticleLikeCount> findLockedByArticleId(Long articleId);
    ...
}
```

#### 1-4-2-2. 낙관적 락

낙관적 락은 동시성 문제가 발생하지 않을 것으로 가정하고 동시성 문제가 발생하면 롤백이나 예외 처리 등을 한다.   
롤백이나 예외 처리 같은 후속 처리에 대한 부분은 따로 구현이 필요하다.   
동시성 문제가 발생할 것으로 예상되는 테이블에 version 컬럼을 추가하고 레코드에 수정을 할 때 version이 같은지 비교한다.    
만약 version 정보가 다르면 다른 요청이 레코드를 수정한 것 이므로 쿼리 실패가 발생해 동시성 문제가 발생한 것을 인지할 수 있다.   
테이블에 version 컬럼을 추가하고 값을 수정하는 쿼리에 version을 비교하는 조건을 추가 하도록 개발해야 하는데,   
Spring JPA에선 엔티티를 정의할 때 version 속성에 @Version 애노테이션을 추가해 사용할 수 있다.   

```java
@Table(name = "article_like_count")
@Getter
@Entity
@ToString
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ArticleLikeCount {
    @Id
    private Long articleId; // shard key
    private Long likeCount;
    @Version
    private Long version;
    ...
}
``` 

### 1-4-3. @NoArgsConstructor(access = AccessLevel.PROTECTED)

@NoArgsConstructor(access = AccessLevel.PROTECTED) 애노테이션은 파라메터가 없는 디폴트 생성자를 생성하고 protected로 접근 제한을 설정한다.    
Entity에 이 애노테이션을 등록하는 이유는 JPA가 Entity를 위해 Proxy 객체를 생성하기 때문이다.     
JPA는 Entity의 Proxy 객체를 통해 접근하고 Proxy 객체를 통해 1차 캐시, 쓰기 지연, 변경 감지 등의 기능을 지원한다.   

# 2. Spring Data Redis

## 2-1. RedisConnection, RedisConnectionFactory

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

## 2-2. RedisTemplate
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

### 2-2-1. RedisTemplate.opsForValue()

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

### 2-2-2. RedisTemplate.opsForZSet()

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

### 2-2-3. RedisTemplate.executePipelined(RedisCallback<?> action)

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

## 2-3. Redis Cache

### 2-3-1. @EnableCaching

CacheConfig 빈에서 캐시 이름, TTL 같이 Redis Cache에 대한 설정을 하고 @EnableCache를 등록해 캐시 기능을 활성화 한다.    

```java
@Configuration
@EnableCaching
public class CacheConfig {
    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        return RedisCacheManager.builder(connectionFactory)
                .withInitialCacheConfigurations(
                        Map.of(
                                "articleViewCount", 
                                RedisCacheConfiguration.defaultCacheConfig().entryTtl(Duration.ofSeconds(1))
                        )
                )
                .build();
    }
}
```

### 2-3-2. @Cacheable

@Cacheable 애노테이션이 등록된 메서드는 동적 프록시가 적용되어 메서드 실행 전 애노테이션의 value 값에 해당하는 Redis Cache에서    
key 정보로 캐싱된 값이 있는지 찾고 있으면 리턴하고 없으면 메서드를 실행해 데이터를 가져온 뒤 메서드에서 응답하는 값을    
Redis Cache에 key 정보로 저장한다.   

```java
@Slf4j
@Component
@RequiredArgsConstructor
public class ViewClient {
    private RestClient restClient;
    @Value("${endpoints.traffic-board-view-service.url}")
    private String viewServiceUrl;

    @PostConstruct
    public void initRestClient() {
        restClient = RestClient.create(viewServiceUrl);
    }

    /**
     * 레디스에서 데이터를 조회해본다.
     * 레디스에 데이터가 없었다면, count 메소드 내부 로직이 호출 되면서, viewService로 원본 데이터를 요청한다. 그리고 레디스에 데이터를 넣고 응답한다.
     * 레디스에 데이터가 있었다면 그 데이터를 그대로 반환한다.
     */
    @Cacheable(key = "#articleId", value = "articleViewCount")
    public long count(Long articleId) {
        log.info("[ViewClient.count] articleId={}", articleId);
        try {
            return restClient.get()
                    .uri("/v1/article-views/articles/{articleId}/count", articleId)
                    .retrieve()
                    .body(Long.class);
        } catch (Exception e) {
            log.error("[ViewClient.count] articleId={}", articleId, e);
            return 0;
        }
    }
}
```

# 3. Spring Data Kafka

Kafka는 분산형 스트리밍 플랫폼으로 대용량의 데이터(이벤트)를 Publish 하거나 Subscribe 하는데 사용된다.   
디스크에 로그 형태로 데이터를 저장해 데이터 손실을 방지한다.    
Kafka는 로그 수집, 실시간 데이터 처리, 이벤트 드리븐 아키텍처 구현 등에 사용된다.   

<br/>

Kafka는 Broker, Topic, Zookeeper로 구성되어 있고 Topic을 다루기 위해 partition, replication, offset과 같은 기능을 제공한다.   

- Broker: Kafka 서버(노드)이다. 여러 개의 Broker가 클러스터를 이뤄 동작할 수 있다.
- Topic: 데이터를 분류하는 단위이고 메시지 큐의 역할을 한다.
- Partition: Topic을 여러 부분으로 나눠 병렬 처리와 확장성을 제공한다. 이벤트에 순서 처리가 필요한 경우 같은 Topic 같은 partition에 저장한다.
    - Offset: 각 Partition에는 Offset이 존재하는데, Consumer group 마다 자산의 Offset을 관리해 원하는 위치 부터 메시지를 읽을 수 있다.   
    - Replication: Partition 데이터는 Replicatin Factor를 설정해 복제해 저장할 수 있다. Leader Partition은 데이터를 읽고 쓰는 주 역할이고 Follower Partition은 Leader의 데이터를 복제하고 장애 발생 시 대체한다.   

<br/>

카프카는 Producer가 메시지(이벤트)가 제대로 전달된 것을 확인하기 위해 ACK를 사용하고 ACK는 0, 1, 2 단계로 설정해 사용할 수 있다.

- 0: Broker에 데이터가 전달 되었는지 확인 안 함
- 1: Leader에만 전달하면 성공
- 2: Leader와 min.insync.replicas 만큼의 follower에 기록되면 성공

## 3-1. KafkaTemplate

Spring은 카프카에 메시지를 보내기 위해 KafkaTemplate를 제공한다.   
KafkaTemplate.send(topic, key, message) 메서드는 key를 통해 topic의 특정 파티션에 message를 전송한다.    
Kfaka는 기본적으로 같은 키 값은 같은 파티션으로 배치하므로 동일한 키를 가진 메시지는 항상 같은 파티션에 저장된다.   
메시지(이벤트)의 순서 보장이 필요한 경우 같은 key를 사용해 전송하면 topic의 partition 내에서 순서를 보장해 준다.   

```java
@Slf4j
@Component
@RequiredArgsConstructor
public class MessageRelay {
    private final OutboxRepository outboxRepository;
    private final MessageRelayCoordinator messageRelayCoordinator;
    private final KafkaTemplate<String, String> messageRelayKafkaTemplate;

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

    private void publishEvent(Outbox outbox) {
        try {
            messageRelayKafkaTemplate.send(
                    outbox.getEventType(). getTopic(),
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

## 3-2. ConcurrentKafkaListenerContainerFactory

ConcurrentKafkaListenerContainerFactory는 Spring에서 @KafkaListener를 사용해 메시지를 소비할 때 필요한 Consumer 컨테이너를 생성하는 Factory 클래스이다.    
ConcurrentKafkaListenerContainerFactory를 빈으로 등록하면 @KafkaListener가 내부적으로 사용해 Kafka로 부터 메시지를 수신 받는다.   
ConcurrentKafkaListenerContainerFactory는 멀티스레드 기반의 병렬 처리를 지원하고 setConcurrency(int concurrency)메서드를 통해 설정할 수 있다.      

```java
@Configuration
public class KafkaConfig {
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, String> kafkaListenerContainerFactory(
            ConsumerFactory<String, String> consumerFactory
    ) {
        ConcurrentKafkaListenerContainerFactory<String, String> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL);
        return factory;
    }
}
```

## 3-3. @KafkaListener

Spring에서 @KafkaListener 애노테이션을 통해 Kafka Consumer를 정의할 수 있다.    
내부적으로 ConcurrentKafkaListenerContainerFactory를 사용해 Consumer를 실행한다.   

```java
@Slf4j
@Component
@RequiredArgsConstructor
public class ArticleReadEventConsumer {
    private final ArticleReadService articleReadService;

    @KafkaListener(topics = {
            EventType.Topic.KUKE_BOARD_ARTICLE,
            EventType.Topic.KUKE_BOARD_COMMENT,
            EventType.Topic.KUKE_BOARD_LIKE
    })
    public void listen(String message, Acknowledgment ack) {
        log.info("[ArticleReadEventConsumer.listen] message={}", message);
        Event<EventPayload> event = Event.fromJson(message);
        if (event != null) {
            articleReadService.handleEvent(event);
        }
        ack.acknowledge();
    }
}
```