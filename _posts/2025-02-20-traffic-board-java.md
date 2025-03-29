---
layout: post
title: 대규모 시스템으로 설계된 게시판에 사용된 Spring 문법과 요소 기술 - Java
date: 2025-03-25 23:00:00 + 0900
categories: Spring
ref: java, Spring, board
---

### 강의 : [스프링부트로 대규모 시스템 설계 - 게시판](https://www.inflearn.com/course/%EC%8A%A4%ED%94%84%EB%A7%81%EB%B6%80%ED%8A%B8%EB%A1%9C-%EB%8C%80%EA%B7%9C%EB%AA%A8-%EC%8B%9C%EC%8A%A4%ED%85%9C%EC%84%A4%EA%B3%84-%EA%B2%8C%EC%8B%9C%ED%8C%90/dashboard)

# 대규모 시스템으로 설계된 게시판에 사용된 Spring 문법과 요소 기술 - Java

# 1. LocalDateTime/Duration

## 1-1. LocalDateTime

### 1-1-1. LocalDateTime.now()
현재 로컬 컴퓨터의 날짜와 시간을 반환   

```java
// 2025-02-23T11:58:20.551705
LocalDateTime.now();
```

## 1-1-2. 비교
- isAfter(LocalDateTime): 인자보다 미래 시간이면 true 반환
- isBefore(LocalDateTime): 인자보다 과거 시간이면 true 반환
- isEqual(LocalDateTime): 인자와 같은 시간이면 true 반환
- compareTo(LocalDateTime)
    - > 0: 인자보다 미래 시간
    - < 0: 인자보다 과거 시간
    - == 0: 인자와 같은 시간

## 1-1-3. ofInstant(Instant, Zone)
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

## 1-2. Duration
시간 간격을 초와 나노초로 표현한다. 간격을 계산하는데 시, 분을 사용할 수 있다.   
시간 간격은 long 타입의 최대값 만큼 저장할 수 있다.    

**자주 사용하는 함수**

- Duration.ofSeconds(long seconds): 인자로 받은 크기 만큼의 초를 표현한다.
- Duration.plusSeconds(long secondsToAdd): 인자로 받은 크기 만큼의 초를 더한다.
- Duration.ofDays(long days): 인자로 받은 크기 만큼의 날을 표현한다. 하루는 24시간으로 계산한다.
- Duration.plusDays(long dayToAdd): 인자로 받은 크기 만큼의 날을 더한다. dayToAdd * 86400 한 값을 더한다.
- Duration.between(Temporal startInclusive, Temporal endExclusive): 시작 시간(startInclusive)과 끝 시간(endExclusive) 사이의 간격을 계산한다. Temporal은 LocalDateTime, Instant 객체를 주로 사용한다.

# 2. CountDownLatch

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

# 3. Optional\<T\>

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

- orElseThrow(Supplier<? extends X> exceptionSupplier) : 값이 있으면 반환하고 없으면 예외를 던진다.

```java
ArticleResponse.from(articleRepository.findById(articleId).orElseThrow());
```

# 4. Predicate

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
