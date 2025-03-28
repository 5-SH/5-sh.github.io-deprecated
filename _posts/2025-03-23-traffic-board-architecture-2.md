---
layout: post
title: 대규모 시스템으로 설계된 게시판의 구조 - Hot Article
date: 2025-03-27 23:50:00 + 0900
categories: Spring
ref: java, Spring, board, traffic
---

### 강의 : [스프링부트로 대규모 시스템 설계 - 게시판](https://www.inflearn.com/course/%EC%8A%A4%ED%94%84%EB%A7%81%EB%B6%80%ED%8A%B8%EB%A1%9C-%EB%8C%80%EA%B7%9C%EB%AA%A8-%EC%8B%9C%EC%8A%A4%ED%85%9C%EC%84%A4%EA%B3%84-%EA%B2%8C%EC%8B%9C%ED%8C%90/dashboard)

# 대규모 시스템으로 설계된 게시판의 구조 - Hot Article

## 0. 서비스 별로 다루는 기술들

|No|서비스|목적|기술|
|---|---|---|---|
|1|Article|게시글 관리|DB Index(clustered, secondary, covering index), 페이징(limit, offset)|
|2|Comment|댓글 관리|2 depth(인접리스트), 무한 depth(경로 열거)|
|3|Like|좋아요 관리|일관성(Transaction), 동시성(pessimistic, optimistic lock, 비동기 순차처리)|
|4|View|조회수 관리|Redis, TTL을 통한 Distributed Lock|
|5|Hot Article|인기글 관리|Consumer-Event Driven Architecture / Producer-Transactional Message(Transactional Outbox), shard key coordinator|
|6|Article Read|게시글 조회 개선|CQRS, Redis Cache, Request Collapsing|

## 1. Hot Article

### 1-1. 인기글 서비스 구조

인기글 서비스는 게시글, 댓글, 좋아요, 조회수 서비스의 정보를 필요로 한다.     
필요한 정보를 매번 API 통신으로 가져온다면 각 서비스에 많은 부하가 전달되고 서비스 간 결합도가 높아져 장애가 전파될 수 있다.   
그리고 서비스들은 MSA로 개발되어 있어 같은 종류의 서비스가 여러 개 실행될 수 있기 때문에 요청을 보내기 위해 로드밸런싱도 필요하다.   
이런 문제를 해결하기 위해 게시글, 댓글, 좋아요, 조회수 서비스에서 이벤트를 발행하고 인기글 서비스는 이벤트를 수신해 동작하도록 개발한다.   
이벤트를 중심으로 구성된 비동기 방식의 아키텍처 패턴을 이벤트 드리븐 아키텍처(EDA)라고 한다.    

<br/>

이벤트를 저장소로 높은 처리량과 성능, 높은 확장성 그리고 메시지를 보장하는 Kafka를 사용한다.   
서비스 별로 Topic을 생성하고 게시글, 댓글, 좋아요, 조회수 서비스는 Producer, 인기글 서비스는 Consumer가 된다.   

<br/>

인기글 서비스의 레포지토리는 Redis를 사용한다.    
인기글 데이터는 매일 갱신되어 오래 저장할 필요가 없고 저장할 데이터가 크지 않다.
그리고 여러 서비스에서 보내는 데이터를 사용하기 때문에 속도가 빨라야 하므로 메모리를 저장소로 사용해야 한다.    
Redis는 메모리를 저장소로 사용하고 싱글스레드로 동작하기 때문에 동시성 문제가 발생하지 않는다.   
그리고 인기글 서비스 구현에 필요한 Sorted Set, TTL과 같은 기능을 제공한다.   

{::nomarkdown}
<div class="mermaid">
graph TD
    subgraph Service ["서비스(Producer)"]
        Article[Article]
        Comment[Comment]
        Like[Like]
        View[View]
    end
    subgraph Kafka ["Kafka(Broker)"]
        TopicA[Article 이벤트]
        TopicC[Comment 이벤트]
        TopicL[Like 이벤트]
        TopicV[View 이벤트]
    end
    subgraph ArticleRead ["Article Read(Consumer)"]
        L1[이벤트 리스너]
        L2[이벤트 핸들러]
    end
    subgraph Redis ["Redis"]
    end

    Service -->|이벤트 발행| Kafka
    L1 --> |이벤트 수신| Kafka
    L1 --> |이벤트 처리|L2
    ArticleRead --> Redis

    
</div>
{:/nomarkdown}

### 1-2. 이벤트 전달 과정

Producer인 게시글, 댓글, 좋아요, 조회수 서비스는 사용자의 요청을 처리할 때 이벤트를 만들어 Kafka에 보낸다.   
Kafka의 Topic에 이벤트가 들어오면 Topic을 구독하고 있는 Subscriber인 인기글 서비스는 이벤트를 수신해 처리한다.    
이 과정에서 이벤트는 아래와 같은 과정을 거치며 전달되고 처리된다.   

{::nomarkdown}
<div class="mermaid">
graph LR
    subgraph Producer[Producer]
        direction LR
        subgraph Entity ["Entity(Article)"]
            desc1["articleId, title, content, boardId, writerId, createdAt, modifiedAt"]
        end

        subgraph EventPayload_Producer ["EventPayload(ArticleCreatedEventPayload)"]
            desc2["articleId, title, content, boardId, writerId, createdAt, modifiedAt, boardArticleCount"]
        end

        subgraph Event_Producer [Event]
            desc3["eventId, eventType, eventPayload"]
        end
    end

    subgraph Kafka[Kafka]
        Topic[Topic]
    end

    subgraph Consumer[Consumer]
        direction LR
        subgraph EventRaw [EventRaw]
            desc4["eventId, eventType, eventPayload"]
        end

        subgraph Event_Consumer [Event]
            desc5["eventId, type, payload"]
        end

        subgraph EventPayload_Consumer ["EventPayload(ArticleCreatedEventPayload)"]
            desc6["articleId, title, content, boardId, writerId, createdAt, modifiedAt, boardArticleCount"]
        end

        subgraph EventHandler [EventHandler]
            desc7["handleEvent(EventPayload)"]
        end
    end

    Entity --> EventPayload_Producer
    EventPayload_Producer --> Event_Producer
    Event_Producer -->|Serialize| Kafka
    Kafka -->|Deserialize| EventRaw
    EventRaw -->|Deserialize| Event_Consumer
    Event_Consumer --> EventPayload_Consumer
    EventPayload_Consumer --> EventHandler
    
</div>
{:/nomarkdown}

- EventPayload: Entity에서 나온 이벤트 정보. 이벤트를 Consumer와 Producer가 주고 받기 위해 Event 객체에 EventType과 EventPayload를 담아서 Kafka에 보낸다.   
- EventType: 이벤트에 따라 Kafka Topic을 정하고 EventPayload를 deserialize할 수 있도록, EventPayload 클래스 정보를 담고 있는 enum이다.
- EventRaw: Consumer가 Kafka에서 이벤트를 수신한 다음 Event 객체로 바꾸기 전 단계이다. EventPayload가 Object 형태(raw)로 저장되어 있다. EventRaw에서 EventType을 활용해 raw 형태의 payload 정보를 EventPayload 형태로 변환한다.

#### 1-2-1. Producer의 이벤트 전달 방법

각 서비스에서 비즈니스 로직이 실행되면 EventPayload를 만든다.    
예를 들어 게시글 서비스에서 게시글이 생성되면 EventPayload를 구현한 ArticleCreatedEventPayload를 생성한다.

```java
Service
@RequiredArgsConstructor
public class ArticleService {
    ...

    @Transactional
    public ArticleResponse create(ArticleCreateRequest request) {
        Article article = articleRepository.save(
                Article.create(snowflake.nextId(), request.getTitle(), request.getContent(), request.getBoardId(), request.getWriterId())
        );
        int result = boardArticleCountRepository.increase(request.getBoardId());
        if (result == 0) {
            boardArticleCountRepository.save(
                    BoardArticleCount.init(request.getBoardId(), 1L)
            );
        }

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
```

생성된 EventPayload는 Event 타입에 담기고 Kafka에 전달된다.
Event 타입을 Kafka에 바로 보내는 것은 아니고 Transactional한 이벤트 전달 보장을 위해 Outbox 패턴을 사용한다.    
Outbox 패턴을 위해 Event는 JSON 형식의 문자열로 Serialize 하고 Outbox에 담겨 Kafka에 보내진다.    
Transactional Message를 구현하기 위한 Transactional Outbox 패턴은 뒤에 설명한다.   

```java
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
                sharedKey % MessageRelayConstants.SHARD_COUNT
        );
        applicationEventPublisher.publishEvent(OutboxEvent.of(outbox));
    }
}

@Getter
public class Event <T extends EventPayload> {
    private Long eventId;
    private EventType type;
    private T payload;

    public static Event<EventPayload> of(Long eventId, EventType type, EventPayload payload) {
        Event<EventPayload> event = new Event<>();
        event.eventId = eventId;
        event.type = type;
        event.payload = payload;
        return event;
    }

    public String toJson() {
        return DataSerializer.serialize(this);
    }
    ...
}

@Slf4j
@NoArgsConstructor(access =  AccessLevel.PROTECTED)
public final class DataSerializer {
    private static final ObjectMapper objectMapper = initialize();

    private static ObjectMapper initialize() {
        return new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    ...

    public static String serialize(Object object) {
        try {
            return objectMapper.writeValueAsString(object);
        } catch (JsonProcessingException e) {
            log.error("DataSerializer.serialize object={}", object, e);
            return null;
        }
    }
}
```

Outbox 패턴에서 Outbox의 전달은 ApplicationEventPublisher를 활용한 Spring Payload 활용해 전달된다.  
전달된 Spring Event는 @TransactionalEventListener 애노테이션이 적용된 메서드에서 처리된다.    
이 메서드에서 KafkaTemplate.send(topic, key, message)를 통해 Kafka에 이벤트를 전달하는 것을 확인할 수 있다.   

```java 
@Slf4j
@Component
@RequiredArgsConstructor
public class MessageRelay {

    private final KafkaTemplate<String, String> messageRelayKafkaTemplate;
    ...

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
#### 1-2-2. Consumer의 이벤트 처리 방법

구독 중인 Kafka의 Topic에 이벤트가 들어오면 @KafkaListener에서 메시지를 수신 받는다.    
수신 받은 메세지는 Event.fromJson(message) 메서드를 통해 Event 타입으로 파싱된다.   

```java
@Slf4j
@Component
@RequiredArgsConstructor
public class HotArticleEventConsumer {
    private final HotArticleService hotArticleService;

    @KafkaListener(
            topics = {
                EventType.Topic.TRAFFIC_BOARD_ARTICLE,
                EventType.Topic.TRAFFIC_BOARD_COMMENT,
                EventType.Topic.TRAFFIC_BOARD_LIKE,
                EventType.Topic.TRAFFIC_BOARD_VIEW
            },
            groupId = "traffic-board-hot-article-service"
        )
    public void listen(String message, Acknowledgment ack) {
        log.info("[HotArticleEventConsumer.listen] received message={}", message);
        Event<EventPayload> event = Event.fromJson(message);
        if (event != null) {
            hotArticleService.handleEvent(event);
        }
        ack.acknowledge();
    }
}
```

인자로 전달된 "message"는 Event를 JSON 형식의 문자열로 serialize 한 값이다.    
DataSerializer.deserialize 메소드를 사용해 Event를 EventRaw로 deserialize 한다.   
그리고 EventRaw의 payload 속성을 EventPayload로 deserialize 한다.   
앞선 Producer의 예시에서 ArticleCreatedEventPayload로 보냈기 때문에 ArticleCreatedEventPayload 형식으로 변환된다.   

```java
@Getter
public class Event <T extends EventPayload> {
    private Long eventId;
    private EventType type;
    private T payload;

    ...

    public static Event<EventPayload> fromJson(String json) {
        EventRaw eventRaw = DataSerializer.deserialize(json, EventRaw.class);
        if (eventRaw == null) {
            return null;
        }
        Event<EventPayload> event = new Event<>();
        event.eventId = eventRaw.getEventId();
        event.type = EventType.from(eventRaw.getType());
        event.payload = DataSerializer.deserialize(eventRaw.getPayload(), event.type.getPayloadClass());
        return event;
    }

    @Getter
    private static class EventRaw {
        private Long eventId;
        private String type;
        private Object payload;
    }
}

@Slf4j
@NoArgsConstructor(access =  AccessLevel.PROTECTED)
public final class DataSerializer {
    private static final ObjectMapper objectMapper = initialize();

    private static ObjectMapper initialize() {
        return new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    public static <T> T deserialize(String data, Class<T> clazz) {
        try {
            return objectMapper.readValue(data, clazz);
        } catch (JsonProcessingException e) {
            log.error("[DataSerializer.deserialize] data={}, clazz={}", data, clazz, e);
            return null;
        }
    }
    ...
}
```

Kafka에서 받아 deserialize된 Event는 hotArticleService.handleEvent(event) 메소드에 전달되어 처리된다.   
EventPayload 구현체 마다 EventHandler를 갖고 있다.   

<br/>

Article Create/Delete 이벤트는 Redis에 Article 생성 시간에 관련된 정보를 추가하거나 삭제한다.   
Article Liked/Unliked, Article Viewed, Comment Created/Deleted 이벤트는 Article이 오늘 생성 되었는지 확인하고 인기글 Score를 계산해,   
Redis의 일자별로 인기글을 저장하고 있는 Sorted Set의 Score를 수정한다.   

<figure>
    <img src="https://github.com/user-attachments/assets/c8fef9c0-5eba-4777-8cfa-f271d974348d" height="350" />
    <figcaption></figcaption>
</figure>

```java
public interface EventHandler<T extends EventPayload> {
    void handle(Event<T> event);
    boolean supports(Event<T> event);
    Long findArticleId(Event<T> event);
}

@Component
@RequiredArgsConstructor
public class ArticleCreatedEventHandler implements EventHandler<ArticleCreatedEventPayload> {
    private final ArticleCreatedTimeRepository articleCreatedTimeRepository;

    @Override
    public void handle(Event<ArticleCreatedEventPayload> event) {
        ArticleCreatedEventPayload payload = event.getPayload();
        articleCreatedTimeRepository.createOrUpdate(
                payload.getArticleId(),
                payload.getCreatedAt(),
                TimeCalculatorUtils.calculateDurationToMidnight()
        );
    }

    @Override
    public boolean supports(Event<ArticleCreatedEventPayload> event) {
        return EventType.ARTICLE_CREATED == event.getType();
    }

    @Override
    public Long findArticleId(Event<ArticleCreatedEventPayload> event) {
        return event.getPayload().getArticleId();
    }
}
```

### 1-3. Transactional Message

#### 1-3-1. Transactional Message 구현 방법 결정정

Producer와 Consumer가 Kafka를 통해 이벤트를 주고 받는 과정에서 이벤트가 제대로 송수신 되지 않는 문제가 발생할 수 있다.    
Broker인 Kafka는 이벤트가 잘 수신 되었는지 ACK를 통해 확인하고 수신 받은 이벤트를 Replication해 무결성을 보장한다.   
그리고 Consumer는 Offset으로 무결하게 이벤트를 수신한다.   

<br/>

Producer에서 Kafka에 무결하게 이벤트를 보내줘야 한다.   
Producer는 비즈니스 로직을 수행하고 관련된 정보를 RDBMS인 MySQL에 저장하고 이벤트를 Kafka에 발행한다.    
MySQL, Kafka 다른 서비스에서 수행 되지만 둘 다 수행 되거나 수행되지 않도록 Transactional 하게 처리 되어야 한다.   
Broker에 메시지를 전송할 때 트랜잭션을 보장하는 메시징 방식을 Transactional Message 라고 한다.    

Transaction Message를 구현하는 방법은 세 가지가 있다.

- Two Phase Commit: 예비 커밋 단계와 최종 커밋 단계로 나눠 트랜잭션 정합성을 보장하는 기법
- Transactional Outbox: 이벤트를 Outbox 테이블에 저장하고 폴링 기반으로 동작하는 별도의 프로세스가 Outbox 테이블을 읽고 Broker에 전송하는 기법
- Transactional Log Tailing: RDBMS 트랜잭션 로그를 실시간으로 감지해 변경된 데이터를 캡처(CDC)해 Broker로 전송하는 기법

Two Phase Commit는 구현이 복잡하고 Transactional Log Tailing은 CDC 기술에 대한 이해가 필요해 러닝 커브가 있다.   
Transactional Outbox은 별도의 러닝 커브가 없고 기존의 환경에서 구현할 수 있고 필요 시 Outbox 테이블에 있는 Event 레코드를 다른 목적으로 활용할 수 있다.   
Transactional Outbox를 사용해 Transactional Message를 구현했다.


{::nomarkdown}
<div class="mermaid">
graph LR
    subgraph Producer [Producer]
        Logic[비즈니스 로직 수행]
        EventPub[이벤트 발행]
    end

    subgraph Kafka[Kafka]
        ACK[ACK]
        Replication[Replication]
    end

    subgraph Consumer [Consumer]
        Offset[Offset]
    end

    Producer -->|이벤트 전송| Kafka
    Consumer -->|이벤트 수신| Kafka
    
</div>
{:/nomarkdown}

#### 1-3-2. Transactional Outbox 구조

Transactional Outbox 기법은 비즈니스 로직을 수행하며 생긴 이벤트를 Outbox 테이블에 저장한다.    
Message Relay는 Outbox에 있는 이벤트를 Kafka에 전송하는 역할을 한다.   
MSA, 분산 환경의 서비스인 경우 게시글, 댓글, 좋아요, 조회수 서비스 마다 여러 개 수행될 수 있다.    
그리고 각 서비스 인스턴스에 Message Relay가 모듈로 적용되어 동작한다.   
따라서 Message Relay의 Polling Scheduler가 동시에 여러 번 수행되어 Outbox에서 같은 이벤트를 여러 번 전송 요청할 수 있다.    
이 문제를 해결하기 위해 Coordinator에서 서비스 별로 실행 중인 인스턴스들에 Shard Key를 중복되지 않게 분배한다.    
여러 서비스 인스턴스가 다른 Shard Key를 갖고서 Kafka Topic Partition에 이벤트를 전송하기 때문에 중복되지 않게 보낼 수 있다.   

<br/>

비즈니스 로직이 수행 될 때 Kafka에 이벤트를 전송하고 전송된 이벤트는 Outbox 테이블에서 삭제한다.    
문제가 생겨 발급이 안된 이벤트는 Outbox 테이블에 남아있고 Polling Scheduler가 Outbox 테이블에서 발급된지 10초가 지난 이벤트는 전송되지 않은 것으로 간주하고 Kafka에 다시 보낸다.   
이 방법으로 전송되지 않은 이벤트들을 관리하고 다시 보내 Producer에서 메시지에 대해 무결성을 보장할 수 있다.   

{::nomarkdown}
<div class="mermaid">
graph LR
    subgraph Article ["Article(Producer)"]
    end

    subgraph RDBMS ["RDBMS(MySQL)"]
        direction LR
        Outbox_Table["Outbox Table"]
        Article_Table["Article Table"]
    end

    subgraph Message_Relay ["Message Relay"]
        direction LR
        subgraph Polling_Scheduler["Polling Scheduler"]
        end
        subgraph Event_Publish["Event Publish"]
        end
        subgraph Coordinator[Coordinator]
        end
    end

    subgraph Kafka ["Kafka"]
    end

    subgraph Redis ["Redis"]
    end

    Article -->|비즈니스 로직 수행| Article_Table
    Article -->|이벤트 추가| Outbox_Table
    Article -->|비즈니스 로직 수행 시 이벤트 발행 요청| Kafka
    Polling_Scheduler -->|주기적으로 Polling| Outbox_Table
    Polling_Scheduler -->|전송되지 않은 이벤트 발행 요청| Event_Publish
    Redis -->|애플리케이션 수에 맞게 shard key 분배| Coordinator
    Coordinator -->|Shard Key로 Partition 선택| Event_Publish
    Event_Publish -->|이벤트 전송| Kafka
</div>
{:/nomarkdown}

#### 1-3-3. Transactional Outbox 동작

{::nomarkdown}
<div class="mermaid">
graph LR
    subgraph Article_Service ["ArticleService"]
        direction LR
        subgraph Transactional ["@Transactinal"]
            subgraph Logic ["비즈니스 로직"]
                articleRepositorySave["articleRepository.save"]
                boardArticleCountRepositoryIncrease["boardArticleCountRepository.increase"]
            end
            subgraph Event_Publish ["이벤트 발행"]
                outboxEventPublisherPublish["outboxEventPublisher.publish"]
            end
        end
    end

    subgraph Outbox_Event_Publisher ["OutboxEventPublisher"]
        subgraph Outbox_Publish ["Outbox 이벤트 발행"]
            applicationEventPublisherPublishEvent["applicationEventPublisher.publishEvent"]
        end
    end

    subgraph Transactional_Event_Listener_Before_Commit ["@TransactionalEventListener (Before Commit)"]
        subgraph create_Outbox ["createOutbox"]
            outboxRepositorySave["outboxRepository.save"]
        end
    end

    subgraph Transactional_Event_Listener_After_Commit ["@TransactionalEventListener (After Commit)"]
        subgraph publish_Event ["Publish Event"]
            messageRelayKafkaTemplateSend["messageRelayKafkaTemplate.send"]
            outboxRepositoryDelete["outboxRepository.delete"]
        end
    end

    subgraph Kafka ["Kafka"]
    end

    subgraph MySQL ["MySQL"]
        Outbox_Table["Outbox Table"]
    end

    Event_Publish -->|EventPayload| Outbox_Publish
    Outbox_Publish -->|"Before Commit OutboxEvent"| create_Outbox
    Outbox_Publish -->|"After Commit OutboxEvent"| publish_Event
    messageRelayKafkaTemplateSend -->|"Event Payload(JSON 형식의 String)"| Kafka
    outboxRepositorySave -->|"Event Payload(JSON 형식의 String)"| Outbox_Table
</div>
{:/nomarkdown}

Service에서 Transactional하게 비즈니스 로직을 수행하고 EventPayload를 만들어 발행한다. 발행한 EventPayload는 OutboxEvent 형식으로 변환되고고 ApplicationEventPublisher를 통해 발급된다.   

```java
@Service
@RequiredArgsConstructor
public class ArticleService {
    private final Snowflake snowflake = new Snowflake();
    private final ArticleRepository articleRepository;
    private final OutboxEventPublisher outboxEventPublisher;
    private final BoardArticleCountRepository boardArticleCountRepository;

    @Transactional
    public ArticleResponse create(ArticleCreateRequest request) {
        Article article = articleRepository.save(
                Article.create(snowflake.nextId(), request.getTitle(), request.getContent(), request.getBoardId(), request.getWriterId())
        );
        int result = boardArticleCountRepository.increase(request.getBoardId());
        if (result == 0) {
            boardArticleCountRepository.save(
                    BoardArticleCount.init(request.getBoardId(), 1L)
            );
        }

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
                sharedKey % MessageRelayConstants.SHARD_COUNT
        );
        applicationEventPublisher.publishEvent(OutboxEvent.of(outbox));
    }
}
```

ApplicationEventPublisher에서 보낸 OutboxEvent는 @TransactionalEventListener에서 받는다.    
ArticleService에서 수행한 Transaction이 커밋되기 전에는 @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)이 OutboxEvent를 받는다.   
MySQL의 Outbox 테이블에 OutboxEvent에서 꺼낸 JSON String 형식의 EventPayload를 저장한다.   
Transaction이 커밋된 후에는 @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)이 OutboxEvent를 받는다.   
OutboxEvent에서 꺼낸 JSON String 형식의 EventPayload를 kafka에 전송하고 완료되면 Outbox 테이블에서 이벤트를 지운다.   
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)는 별도의 스레드 풀을 통해 비동기적으로 동작하고,   
@TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)는 ArticleService를 수행하는 스레드로 동작한다.   

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

    @
            Scheduled(
            fixedDelay = 10,
            initialDelay = 5,
            timeUnit = TimeUnit.SECONDS,
            scheduler = "messageRelayPublishPendingEventExecutor"
    )
    public void publishPendingEvent() {
        AssignedShard assignedShard = messageRelayCoordinator.assignShards();
        log.info("[MessageRelay.publishPendingEvent assignedShard size={}", assignedShard.getShards().size());
        for (Long shard : assignedShard.getShards()) {
            List<Outbox> outboxes = outboxRepository.findAllByShardKeyAndCreatedAtLessThanEqualOrderByCreatedAtAsc(
                    shard,
                    LocalDateTime.now().minusSeconds(10),
                    Pageable.ofSize(100)
            );
            for (Outbox outbox : outboxes) {
                publishEvent(outbox);
            }
        }
    }
}
```

### 1-4. Outbox의 Shard Key 관리

게시글, 댓글, 좋아요, 조회수 서비스는 MSA로 동작할 수 있어 여러 개가 실행될 수 있다.    
이 때 서비스 마다 Outbox 테이블을 Polling 하면 이벤트가 중복 처리될 수 있다.   
그래서 서비스 별로 실행되고 있는 수에 따라 Shard Key를 분배해서 Outbox의 이벤트를 중복되지 않게 처리한다.   
이 역할은 Message Relay의 Coordinator에서 수행한다.   

<br/>

실행 중인 서비스의 목록을 관리하기 위해 app들은 Redis에 주기적으로 PING을 보낸다.    
서비스 종류 별로 Redis의 zSet을 가지고 Score 값은 PING을 보낸 시간(sec)를 갖는다.    
그리고 PING을 보낼 때 마다 PING_INTERNAL_SECOND * PING_FAILURE_THRESHOLD 만큼 지난 Score를 가진 항목은 실행이 중지된 서비스로 간주하고 목록에서 제거한다.   

{::nomarkdown}
<div class="mermaid">
graph TD
    subgraph Article_Service_1 ["Article #1"]
        Article_PING1["PING #1"]
    end

    subgraph Article_Service_2 ["Article #2"]
        Article_PING2["PING #2"]
    end

    subgraph Article_Service_3 ["Article #3"]
        Article_PING3["PING #3"]
    end

    subgraph Comment_Service_1 ["Comment #1"]
        Comment_PING1["PING #1"]
    end

    subgraph Comment_Service_2 ["Comment #2"]
        Comment_PING2["PING #2"]
    end

    subgraph Comment_Service_3 ["Comment #3"]
        Comment_PING3["PING #3"]
    end

    subgraph Redis ["Redis"]
        subgraph Coordinator_List_Article["Coordinator List Article"]
            subgraph Article_appId_score["appId | score"]
                article_val1["Article #1 | 1743264777"]
                article_val2["Article #2 | 1743262347"]
                article_val3["Article #3 | 1743264774"]
            end
        end
        subgraph Coordinator_List_Comment["Coordinator List Comment"]
            subgraph Comment_appId_score["appId | score"]
                comment_val1["Comment #1 | 1743264778"]
                comment_val2["Comment #2 | 1743262348"]
                comment_val3["Comment #3 | 1743264779"]
            end
        end
    end

    Article_PING1 -->|"Instant.now().toEpochMilli()"| Coordinator_List_Article
    Article_PING2 -->|"Instant.now().toEpochMilli()"| Coordinator_List_Article
    Article_PING3 -->|"Instant.now().toEpochMilli()"| Coordinator_List_Article
    Comment_PING1 -->|"Instant.now().toEpochMilli()"| Coordinator_List_Comment
    Comment_PING2 -->|"Instant.now().toEpochMilli()"| Coordinator_List_Comment
    Comment_PING3 -->|"Instant.now().toEpochMilli()"| Coordinator_List_Comment
</div>
{:/nomarkdown}

```java
@Component
@RequiredArgsConstructor
public class MessageRelayCoordinator {
    private final StringRedisTemplate redisTemplate;

    @Value("${spring.application.name}")
    private String applicationName;

    private final String APP_ID = UUID.randomUUID().toString();

    private final int PING_INTERVAL_SECONDS = 3;
    private final int PING_FAILURE_THRESHOLD = 3;

    public AssignedShard assignShards() {
        return AssignedShard.of(APP_ID, findAppIds(), MessageRelayConstants.SHARD_COUNT);
    }

    private List<String> findAppIds() {
        return redisTemplate.opsForZSet().reverseRange(generateKey(), 0, -1).stream()
                .sorted().toList();
    }

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

    @PreDestroy
    public void leave() {
        redisTemplate.opsForZSet().remove(generateKey(), APP_ID);
    }

    private String generateKey() {
        return "message-relay-coordinator::app-list::%s".formatted(applicationName);
    }
}
```