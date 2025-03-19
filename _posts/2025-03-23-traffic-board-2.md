---
layout: post
title: 대규모 시스템으로 설계된 게시판의 구조
date: 2025-03-23 08:00:00 + 0900
categories: Spring
ref: java, Spring, board, traffic
---

### 강의 : [스프링부트로 대규모 시스템 설계 - 게시판](https://www.inflearn.com/course/%EC%8A%A4%ED%94%84%EB%A7%81%EB%B6%80%ED%8A%B8%EB%A1%9C-%EB%8C%80%EA%B7%9C%EB%AA%A8-%EC%8B%9C%EC%8A%A4%ED%85%9C%EC%84%A4%EA%B3%84-%EA%B2%8C%EC%8B%9C%ED%8C%90/dashboard)

# 대규모 시스템으로 설계된 게시판의 구조

## 0. 서비스 별로 다루는 기술들

|No|서비스|목적|기술|
|---|---|---|---|
|1|Article|게시글 관리|DB Index(clustered, secondary, covering index), 페이징(limit, offset)|
|2|Comment|댓글 관리|2 depth(인접리스트), 무한 depth(경로 열거)|
|3|Like|좋아요 관리|일관성(Transaction), 동시성(pessimistic, optimistic lock, 비동기 순차처리)|
|4|View|조회수 관리|Redis, TTL을 통한 Distributed Lock|
|5|Hot Article|인기글 관리|Consumer-Event Driven Architecture / Producer-Transactional Message(Transactional Outbox), shard key coordinator|
|6|Article Read|게시글 조회 개선||

## 1. Article
Article 서비스는 게시글을 Distributed RDBMS인 MySQL의 Article 테이블에 생성, 삭제, 수정한다.   
그리고 게시글을 조회하기 위한 페이징 기능을 제공한다.   
게시글의 개수가 1,000만 건 수준으로 많아지면 페이징을 위한 limit, offset 연산과 게시글 정렬 과정이 오래 걸려 게시글의 조회에 수 초가 걸리게 된다.   
이 문제를 Article 테이블에 적절한 인덱스를 설정해 해결할 수 있다.   
<br/>
[Article 테이블]   

|이름|타입|
|---|---|
|article_id|bigint|
|title|varchar(100)|
|content|varchar(3000)|
|board_id|bigint|
|writer_id|bigint|
|created_at|datetime|
|modified_at|datetime|

### 1-1. 페이징
많은 게시글의 순차적인 조회를 위해 페이징 기법을 제공한다.   
페이징 기법은 MySQL의 limit와 offset 연산을 통해 제공할 수 있다.    

#### 1-1-1. 페이지 번호
페이지 번호 방식은 N번 페이지의 M개의 게시글 정보와 전체 게시글 수 정보가 필요하다.    
N번 페이지의 M개의 게시글 정보는 limit와 offset 연산으로 조회할 수 있고 이 때 발생하는 성능 문제는 아래 설명하는 Secondary, Covering Index로 해결할 수 있다.   
그리고 게시글의 수가 많으면 전체 게시글의 수를 조회할 때 테이블을 풀 스캔해야하기 때문에 성능 문제가 발생할 수 있다.   
그러나 아래 사진과 같이 현재 페이지(N)와 페이지에 보여주는 게시글의 수(M)의 값에 따라 페이지 번호 목록을 보여주는데 전체 게시글 수가 필요하지 않고 이동 가능한 페이지 개수의 최대 값 까지만 조회하면 된다.   
<br/>
따라서 현재 페이지(N), 페이지 당 게시글 개수(M), 이동 가능한 페이지 개수(K) 일 때 게시글의 수 정보를,    
((N - 1) / K + 1) * M * K + 1로 조회해 성능을 개선할 수 있다.

<figure>
  <img src="https://github.com/user-attachments/assets/5fb916e7-e170-44ab-95bf-4efb183e83af" height="100" />
  <figcaption></figcaption>
</figure>

#### 1-1-2. 무한 스크롤
무한 스크롤 방식을 현재 페이지(N), 페이지 당 게시글 개수(M)를 사용하는 페이지 번호 방식으로 구현하면,    
스크롤을 요청하는 사이에 게시글의 등록, 삭제가 일어 났을 때 게시글 조회가 누락되는 문제가 발생한다.   
그래서 offset 연산 없이 article_id를 기준으로 limit 연산을 하도록 구현한다.   
<br/>
페이지 번호 방식은 offset, limit 연산을 하기 때문에 offset이 커질 수록 조회 성능이 떨어진다.   
그러나 무한 스크롤 방식은 article_id를 기준으로 limit 연산을 하기 때문에 매번 조회 성능이 동일한 특징이 있다.    

### 1-2. Index
#### 1-2-1. Clustered Index
MySQL은 테이블을 생성할 때 설정한 PK로 Clustered Index를 생성하는데, 이 인덱스의 leaf node는 실제 row 값을 갖고 있다.   
PK인 article_id는 snowflake를 사용한 PK 이다. snowflake는 분산 시스템에서 고유한 오름차순을 위해 개발된 알고리즘 이다.   

|비트 수|필드|설명|
|---|---|---|
|1 bit|기호 비트|항상 양수를 보장|
|41 bit|타임스탬프|현재 시간(밀리초)=기준시간(epoch)|
|10 bit|워커 ID|데이터센터 & 서버 ID|
|12 bit|시퀀스 번호|같은 밀리초 내에서 생성디는 번호|

```
| 0 |  00011010101010101010101010101010101010101  | 0000010101 | 000000000001 |
```

#### 1-2-2. Secondary Index
게시글을 조회하기 위해 게시글을 생성 일자 역순으로 정렬하고 limit, offset 연산을 한다.   
매번 조회를 할 때 마다 테이블을 풀스캔 해서 정렬해야 해서 조회 속도가 느리게 된다.    
그리고 데이터가 많은 경우 메모리에 모두 올려서 정렬을 할 수 없기 때문에 디스크에서 정렬을 수행하는 filesort도 하게 되어 속도가 더욱 느려진다.

```sql
select * from article
where board_id = {board_id}
order by created_at desc
limit {limit} offset {offset};
```

게시글을 추가, 삭제할 때 정렬이 될 수 있도록 Article 테이블에 인덱스를 추가한다.    
article_id는 snowflake를 사용한 PK 이고 snowflake는 분산 시스템에서 고유한 오름차순을 위해 개발된 알고리즘 이므로 게시글 생성 시간 정렬에 craated_at 대신에 사용할 수 있다.   
시분초를 사용하는 created_at을 사용하면 게시글 생성 요청이 동시에 오는 경우 같은 값을 가질 수 있기 때문에 article_id로 정렬한다.

```sql
create index idx_board_id_article_id on article(board_id asc, artice_id desc);
```

board_id와 article_id로 생성한 인덱스를 Secondary Index라고 한다.    
Secondary Index의 leaf node는 인덱스 정보인 board_id, article_id 값과 실제 row의 포인터를 갖고 있다.    
그래서 Secondary Index에서 조회하고 전체 row 정보를 찾기 위해 포인터를 이용해 Clustered Index의 leaf node에 접근한다.   

#### 1-2-3. Covered Index
offset을 1,500,000과 같이 큰 값으로 조회를 하면 여전히 수 초가 걸리는 것을 확인할 수 있다.   
Secondary Index에서 offset 만큼 스캔을 할 때 매번 Clustered Index의 leaf node에 접근해 실제 row 데이터를 가져온다.   
왜냐하면 Secondary Index의 컬럼이 아닌 where 조건이 있는 경우 조건 확인하기 위해서 이다.   
그래서 offset 크기인 1,500,000번 만큼 실제 row를 가져오기 때문에 속도가 느려지게 된다.   

<figure>
  <img src="https://github.com/user-attachments/assets/e169d930-df7f-4ab2-86f1-52c2bbe2271a" height="350" />
  <figcaption>▲ 출처: https://velog.io/%40minbo2002/coveringIndex</figcaption>
</figure>

Secondary Index의 컬럼 만으로 처리할 수 있는 인덱스를 Covering Index라고 한다.   
board_id, article_id 만을 조회하면 실제 row를 가져오지 않고 Secondary Index에서만 순회를 한다.    
필요한 offset 만큼 Secondary Index에서 순회하고 조건에 맞는 row 만 Clustered Index에서 가져오도록 join 연산을 추가해 성능을 개선할 수 있다.   

```sql
select * from(
    select article_id from article
    where board_id = 1
    order by artice id desc
    limit 30 offset 1500000
) t left join article on t.article_id = article.article_id;
```

#### 1-2-4. offset이 더 커지면
Covering Index를 사용해 offset이 커졌을 때 조회 성능을 개선했다.    
그러나 offset이 더 커진다면 Secondary Index를 스캔하는 절대적인 시간 자체가 늘어나 느려질 수 있다.    
이런 경우는 스캔하는 양을 줄여야 하기 때문에 연도 별로 테이블을 나눠 게시글을 저장하거나,    
일정 offset 이상의 조회는 어뷰징으로 판단하고 지원하지 않도록 정책적으로 해결해야 한다.   

## 2. Comment
Comment 서비스는 게시글에 등록된 댓글들을 관리한다.   
댓글은 2단 depth 구조를 갖거나 무한 depth 구조를 가질 수 있다.   

### 2-1. 2 depth Comment
2단 detph 구조를 갖는 댓글은 테이블에 댓글 정보를 인접리스트 형식으로 저장해 구현할 수 있다.   
parent_commet_id 컬럼을 사용해 상위 댓글과 연결된다.

[Comment 테이블 - 2 depth]   

|이름|타입|
|---|---|
|commet_id|bigint|
|content|varchar(3000)|
|article_id|bigint|
|parent_commet_id|bigint|
|writer_id|bigint|
|deleted|BOOL|
|created_at|datetime|

### 2-2. 무한 detph Comment
무한 depth 구조를 갖는 댓글은 경로 열거 방식으로 구현할 수 있다.   
각 경로를 depth 별로 5개의 문자로 표현한다. 숫자만을 사용하면 depth 별로 표현할 수 있는 가지수가 10^5 밖에 안된다.    
0-9A-Za-z 문자를 사용해 62^5 가지를 지원할 수 있다.    
문자의 대소를 비교하기 위해 테이블의 collation을 수정해야 한다.    
MySQL의 기본 collation은 utf8mb4_0900_ai_ci이고 대소문자의 비교를 지원하지 않는다.    
0~9 < A-Z < a-z 순서로 대소를 구분하는 utf8mb4_bin로 수정한다.    
아래 테이블에선 path 컬럼의 길이가 5*5 이므로 5 depth 까지 댓글을 달 수 있다.

[Comment 테이블 - 무한 depth]   

|이름|타입|
|---|---|
|commet_id|bigint|
|content|varchar(3000)|
|article_id|bigint|
|writer_id|bigint|
|path|varchar(25)|
|deleted|BOOL|
|created_at|datetime|

## 3. Like
게시글에 대한 좋아요를 관리하기 위해 article_like 테이블과 article_like_count 테이블을 사용한다.   
한 사용자가 한 게시글에 하나의 좋아요만 누를 수 있도록 article_like 테이블을 사용하고    
좋아요 수를 조회하는 비용을 줄이기 위해해 article_like_count 테이블을 사용한다.   
사용자가 게시글에 좋아요 버튼을 누르면 article_like 테이블에 좋아요 정보를 등록하고 article_like_count 테이블에서 article_id에 해당하는 row의 like_count에 1을 더한다.   
<br/>
article 테이블에 좋아요 수를 관리하도록 설계할 수 있다. 그러나 좋아요 수 요청과 게시글 등록, 삭제, 수정 요청은 다른 Lifecycle의 요청이다.   
그리고 좋아요 수에 1을 더하기 위해 record lock을 설정하기 때문에 좋아요 요청으로 인해 게시글 요청이 처리되지 않을 수 있다.   
관심사가 다르기 때문에 게시글과 좋아요 수를 정규화해 다른 테이블로 관리하도록 설계했다.   

[article_like 테이블]   

|이름|타입|
|---|---|
|article_like_id|bigint|
|article_id|bigint|
|user_id|bigint|
|created_at|bigint|

[article_like_count 테이블]   

|이름|타입|
|---|---|
|article_id|bigint|
|like_count|bigint|

### 3-1. 일관성 문제
article_like 테이블에 좋아요 정보를 추가, 삭제하는 것과 article_like_count 테이블에 좋아요 수를 1 더하는 것은 원자적으로 동작해야 한다.    
좋아요 정보가 추가되고 좋아요 수를 1을 더하거나 아니면 모두 실패해야 한다.    
두 요청이 Transactional 하게 동작하도록 @Transactional 애노테이션을 활용해 개발한다.

```java
@Service
@RequiredArgsConstructor
public class ArticleLikeService {
    private final Snowflake snowflake = new Snowflake();
    private final ArticleLikeRepository articleLikeRepository;
    private final OutboxEventPublisher outboxEventPublisher;
    private final ArticleLikeCountRepository articleLikeCountRepository;
    
    ...

    /**
     * update 구문
     */
    @Transactional
    public void likePessimisticLock1(Long articleId, Long userId) {
        ArticleLike articleLike = articleLikeRepository.save(
                ArticleLike.create(
                        snowflake.nextId(),
                        articleId,
                        userId
                )
        );

        int result = articleLikeCountRepository.increase(articleId);
        if (result == 0) {
            // 최초 요청 시에는 update 되는 레코드가 없으므로, 1로 초기화 한다.
            // 트래픽이 순식간에 몰릴 수 있는 상황에는 유실될 수 있으므로, 게시글 생성 시점에 미리 0으로 초기화 해둘 수도 있다.
            articleLikeCountRepository.save(ArticleLikeCount.init(articleId, 1L));
        }

        outboxEventPublisher.publish(
                EventType.ARTICLE_LIKED,
                ArticleLikedEventPayload.builder()
                        .articleLikeId(articleLike.getArticleLikeId())
                        .articleId(articleLike.getArticleId())
                        .userId(articleLike.getUserId())
                        .createdAt(articleLike.getCreatedAt())
                        .articleLikeCount(count(articleLike.getArticleId()))
                        .build(),
                articleLike.getArticleId()
        );
    }

    @Transactional
    public void unlikePessimisticLock1(Long articleId, Long userId) {
        articleLikeRepository.findByArticleIdAndUserId(articleId, userId)
                .ifPresent(articleLike -> {
                    articleLikeRepository.delete(articleLike);
                    articleLikeCountRepository.decrease(articleId);

                    outboxEventPublisher.publish(
                            EventType.ARTICLE_UNLIKED,
                            ArticleUnlikedEventPayload.builder()
                                    .articleLikeId(articleLike.getArticleLikeId())
                                    .articleId(articleLike.getArticleId())
                                    .userId(articleLike.getUserId())
                                    .createdAt(articleLike.getCreatedAt())
                                    .articleLikeCount(count(articleLike.getArticleId()))
                                    .build(),
                            articleLike.getArticleId()
                    );
                });
    }
...
}
```

### 3-2. 동시성 문제
한 게시글에 좋아요 요청이 동시에 들어오는 경우 좋아요 수 추가가 누락되는 경우가 발생할 수 있다.    
이런 동시성 문제를 Lock이나 비동기 순차처리 방법을 사용해 해결할 수 있다.    
Lock은 동시성 문제가 발생할 것으로 간주하고 개발하는 Pessimistic Lock과 발생하지 않을 것으로 간주하는 Optimistic Lock 두 가지 방법이 있다.

#### 3-2-1. Pessimistic Lock
동시성 문제가 발생한다고 간주하는 Pessimistic Lock(비관적 락)은 좋아요 수를 더할 때 트랜잭션에서 해당하는 row에 Record Lock을 걸어 다른 트랜잭션은 기다리도록 한다.   
Lock은 Update 문을 사용하거나 select ... for update 문을 사용해 사용할 수 있다.

##### 3-2-1-1. Update

Update 문을 사용하면 Record Lock이 설정된다.

```java
@Repository
public interface ArticleLikeCountRepository extends JpaRepository<ArticleLikeCount, Long> {

    // select ... for update
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<ArticleLikeCount> findLockedByArticleId(Long articleId);

    @Query(
            value = "update article_like_count set like_count = like_count + 1 where article_id = :articleId",
            nativeQuery = true
    )
    @Modifying
    int increase(@Param("articleId") Long articleId);

    @Query(
            value = "update article_like_count set like_count = like_count - 1 where article_id = :articleId",
            nativeQuery = true
    )
    @Modifying
    int decrease(@Param("articleId") Long articleId);
}
```
##### 3-2-1-2. select ... for update
JPA의 @Lock(LockModeType.PESSIMISTIC_WRITE) 애노테이션을 사용하면 트랜잭션에서 좋아요 수를 더하려는 row에 Record Lock을 설정한다.   
이어서 해당하는 row의 좋아요 수를 더한다.   

```java
@Repository
public interface ArticleLikeCountRepository extends JpaRepository<ArticleLikeCount, Long> {

    // select ... for update
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<ArticleLikeCount> findLockedByArticleId(Long articleId);

    @Query(
            value = "update article_like_count set like_count = like_count + 1 where article_id = :articleId",
            nativeQuery = true
    )
    @Modifying
    int increase(@Param("articleId") Long articleId);

    @Query(
            value = "update article_like_count set like_count = like_count - 1 where article_id = :articleId",
            nativeQuery = true
    )
    @Modifying
    int decrease(@Param("articleId") Long articleId);
}
```

#### 3-2-2. Optimistic Lock
Optimistic Lock(낙관적 락)은 version 컬럼을 사용한다.   
좋아요 수를 더할 때 version 컬럼의 값을 같이 비교해 다른 트랜잭션에서 좋아요 수를 수정하지 않았는지 확인한다.    
다른 트랜잭션에서 수정했을 경우 version 값이 다르기 때문에 쿼리가 실패한다.   
다른 트랜잭션들을 기다리도록해 좋아요 수를 더하는 비관적 락과 다르게 낙관적 락은 쿼리가 실패할 수 있기 때문에,    
실패했을 때 롤백을 하거나 사용자에게 알리는 등 추가적인 개발이 필요하다.   
<br/>
JPA에서 제공하는 @Version 애노테이션을 사용하면 별도의 구현없이 낙관적 락을 사용할 수 있다.    
그리고 좋아요 수를 더하고 뺄 때 쿼리는 내부적으로 아래와 같이 동작한다.

```sql
update article_like_count
set like_count = like_count + 1
where article_id = :articeId and version = :version
```

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

    public static ArticleLikeCount init(Long articleId, Long likeCount) {
        ArticleLikeCount articleLikeCount = new ArticleLikeCount();
        articleLikeCount.articleId = articleId;
        articleLikeCount.likeCount = likeCount;
        articleLikeCount.version = 0L;
        return articleLikeCount;
    }

    public void increase() {
        this.likeCount++;
    }

    public void decrease() {
        this.likeCount--;
    }
}
```

#### 3-2-3. 비동기 순차처리

좋아요 요청이 들어오면 순차적으로 대기열에 담고 사용자에게 응답을 먼저 한 뒤, 싱글 스레드에서 하나씩 처리하도록 개발할 수 있다.   
대기열에 담긴 요청들을 싱글 스레드로 하나씩 처리하기 때문에 동시성 문제가 발생하지 않는다.   
그러나 문제가 생겨 요청 처리를 실패한 경우 사용자에게 실패했다는 알림을 주는 방법이 고안되어야 하고    
비동기 순차처리를 위한 대기열과 비동기 처리 구현이 필요하기 때문에 개발과 관리에 어려움이 있을 수 있다.

## 4. View
조회수 정보는 게시글이 조회된 횟수만 저장하면 되고 어뷰징 방지를 위해 각 사용자는 게시글 당 10분에 1번만 조회수가 집계될 수 있어야 한다.    
조회수 정보는 매번 영구 보관하지 않고 정해진 개수 마다 백업한다.   
<br/>
조회수 정보는 쓰기 트래픽이 많아 처리 속도가 중요하고 비교적 덜 중요한 자료라서 최신 값을 영구 보관할 필요가 없다.   
RDBMS는 일관성을 보장하고 최신 값을 영구 보관할 수 있지만 디스크 접근 비용과 트랜잭션 관리 비용이 들어 조회수 정보를 저장하는데 적절하지 않다.   
그리고 조회수 정보는 트래픽이 많아 디스크 접근이 자주 발생해 속도가 느릴 수 있다.   
<br/>
디스크 보다 빠르게 접근할 수 있는 메모리를 저장소로 사용하고 싱글 스레드를 사용해 동시성 문제가 없는 Redis를 조회수 정보를 저장하는데 사용한다.   
그리고 어뷰징 방지 기능을 Redis에서 지원하는 TTL(Time To Live)을 사용해 구현할 수 있다.   

[article_view_count 테이블]

|이름|타입|
|---|---|
|article_id|bigint|
|view_count|bigint|

### 4-1. 어뷰징 방지, 조회수 백업 기능
view 서비스는 MSA로 만들어졌기 때문에 여러 서비스 인스턴스에서 요청이 들어올 수 있다.    
분산 환경에서 조회수 어뷰징을 막기 위해 분산 락을 사용한다.    
게시글의 조회수를 올리기 전 사용자가 10분 사이에 이 게시글을 읽었는지 확인하기 위해 분산 락을 설정한다.   

<br/>

Redis에 articleId와 userId를 포함하는 키를 TTL 10분으로 설정해 저장한다.    
설정할 때 setIfAbsent 함수를 사용해 키가 없으면 추가하고 true를 반홚고 있으면 false를 반환한다.    
false를 받으면 분산 락이 있는 것이고 10분 내에 사용자가 이 게시글을 읽은 것 이므로 조회수를 올리지 않는다.   
분산 락을 설정해 true를 받으면 articleViewCountRepository.increase 함수를 통해 조회수를 올린다.   
increase 함수는 RedisTemplate의 increment 함수를 호출하는데, increment 함수는 원자적으로 동작하기 때문에 동시성 문제가 발생하지 않는다.   

<br/>

마지막으로 조회수가 Redis에 1000개가 되면 articleViewCountBackUpProcessor.backUp 메소드를 통해 RDBMS에 백업한다.
```java
@Service
@RequiredArgsConstructor
public class ArticleViewService {
    private final ArticleViewCountRepository articleViewCountRepository;
    private final ArticleViewCountBackUpProcessor articleViewCountBackUpProcessor;
    private final ArticleViewDistributedLockRepository articleViewDistributedLockRepository;

    private static final int BACK_UP_BATCH_SIZE = 1000;
    private static Duration TTL = Duration.ofMinutes(10);

    public Long increase(Long articleId, Long userId) {
        if (!articleViewDistributedLockRepository.lock(articleId, userId, TTL)) {
            return articleViewCountRepository.read(articleId);
        }

        Long count = articleViewCountRepository.increase(articleId);
        if (count % BACK_UP_BATCH_SIZE == 0) {
            articleViewCountBackUpProcessor.backUp(articleId, count);
        }
        return count;
    }

    ...
}

@Repository
@RequiredArgsConstructor
public class ArticleViewDistributedLockRepository {
    private final StringRedisTemplate redisTemplate;

    // view::article::{article_id}::user::{user_id}::lock
    private static final String KEY_FORMAT = "view::article::%s::user::%s::lock";

    public boolean lock(Long articleId, Long userId, Duration ttl) {
        String key = generateKey(articleId, userId);
        // setIfAbsent는 원자적으로 동작
        return redisTemplate.opsForValue().setIfAbsent(key, "", ttl);
    }
    ..
}

@Repository
@RequiredArgsConstructor
public class ArticleViewCountRepository {
    private final StringRedisTemplate redisTemplate;

    // view::article::{article_id}::view_count
    private static final String KEY_FORMAT = "view::article::%s::view_count";

    ...

    public Long increase(Long articleId) {
        return redisTemplate.opsForValue().increment(generateKey(articleId));
    }

    ...
}

@Component
@RequiredArgsConstructor
public class ArticleViewCountBackUpProcessor {
    private final OutboxEventPublisher outboxEventPublisher;
    private final ArticleViewCountBackUpRepository articleViewCountBackUpRepository;

    @Transactional
    public void backUp(Long articleId, Long viewCount) {
        int result = articleViewCountBackUpRepository.updateViewCount(articleId, viewCount);
        if (result == 0) {
            articleViewCountBackUpRepository.findById(articleId)
                    .ifPresentOrElse(ignored -> { },
                            () -> articleViewCountBackUpRepository.save(ArticleViewCount.init(articleId, viewCount)));
        }

        ...
    }
}
```