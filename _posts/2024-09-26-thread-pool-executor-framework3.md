---
layout: post
title: Java 스레드8 - 스레드 풀과 Executor 프레임워크3
date: 2024-09-26 19:00:00 + 0900
categories: [java]
tags: [java, thread, multi-thread, thread pool, executor]
---

### 강의 : [김영한의 실전 자바 - 고급 1편, 멀티스레드와 동시성](https://www.inflearn.com/course/%EA%B9%80%EC%98%81%ED%95%9C%EC%9D%98-%EC%8B%A4%EC%A0%84-%EC%9E%90%EB%B0%94-%EA%B3%A0%EA%B8%89-1/dashboard)

# 14. 스레드 풀과 Executor 프레임워크3

## 14-1. Executor 전략 - 고정 풀 전략

#### Executor 스레드 풀 관리 - 다양한 전략

ThreadPoolExecutor를 사용하면 스레드 풀에 사용되는 숫자와 블로킹 큐 등 다양한 속성을 조절할 수 있다.   
- corePoolSize: 스레드 풀에서 관리되는 기본 스레드의 수
- maximumPoolSize: 스레드 풀에서 관리되는 최대 스레드 수
- keepAliveTime, TimeUnit unit: 기본 스레드 수를 초과해서 만들어진 스레드가 생존할 수 있는 대기 시간, 이 시간 동안 처리할 작업이 없다면 초과 스레드는 제거된다.
- BolcingQueue workQueue: 작업을 보관할 블로킹 큐
     
자바는 Executors 클래스를 통해 3가지 기본 전략을 제공한다.   
- newSingleThreadPool(): 단일 스레드 풀 전략
- newFixedThreadPool(nThreads): 고정 스레드 풀 전략
- newCachedThreadPool(): 캐시 스레드 풀 전략
   
#### newSingleThreadPool()
- 스레드 풀에 기본 스레드 1개만 사용한다.
- 큐 사이즈에 제한이 없다.(LinkedBlockingQueue)
- 주로 간단히 사용하거나, 테스트 용도로 사용한다.

```java
new ThreadPoolExecutor(1, 1, 0L, TimeUnit.MILLISECONDS, new LinkedBlockingQueue<Runnable>())
```

### 14-1-1. Executor 스레드 풀 관리 - 고정 풀 전략

#### newFixedThreadPool(nThreads)

- 스레드 풀에 nThreads 만큼의 기본 스레드를 생성한다. 초과 스레드는 생성하지 않는다.
- 큐 사이즈에 제한이 없다.(LinkedBlockingQueue)
- 스레드 수가 고정되어 있기 때문에 CPU, 메모리 리소스가 어느 정도 예측 가능한 안정적인 방식이다.

```java
public class PoolSizeMainV2 {

    public static void main(String[] args) {

        ExecutorService es = Executors.newFixedThreadPool(2);
        log("pool 생성");
        printState(es);

        for (int i = 1; i <= 6; i++) {
            String taskName = "task" + i;
            es.execute((new RunnableTask(taskName)));
            printState(es, taskName);
        }
        es.close();
        log("== shutdown 완료 ==");
    }
}
```

#### 특징

스레드 수가 고정되어 있기 때문에 CPU, 메모리 리소스가 어느 정도 예측 가능한 안정적인 방식이다.    
큐 사이즈도 제한이 없어서 작업을 많이 담아 두어도 문제가 없다.   

#### 주의

이 방식의 가장 큰 장점은 스레드 수가 고정 되어서 CPU, 메모리 리소스가 어느 정도 예측 가능하다는 점이다.   
따라서 일반적인 상황에 가장 안정적으로 서비스를 운영할 수 있다. 하지만 아래 상황일 때 단점이 되기도 한다.   

#### 상황1 - 점진적인 사용자 확대

- 개발한 서비스가 잘 되어서 사용자가 점점 늘어난다.
- 고정 스레드 전략을 사용해서 안정적으로 잘 운영했는데, 언젠가부터 사용자들이 서비스 응답이 점점 느려진다고 항의한다.
   
#### 상황2 - 갑작스런 요청 증가
- 마케팅 팀의 이벤트가 성공 하면서 갑자기 사용자가 폭증했다.
- 고객은 응답을 받지 못한다고 항의한다.
   
#### 확인
- 개발자는 CPU, 메모리 사용량을 확인해 보지만 문제 없이 여유 있고 안정적으로 서비스가 운영되고 있다.
- 고정 스레드 전략은 실행되는 스레드 수가 고정되어 있다. 따라서 사용자가 늘어나도 CPU, 메모리 사용량이 확 늘어나지 않는다.
- 큐의 사이즈를 확인해보니 요청이 수 만 건 쌓여있다. 요청이 처리되는 시간보다 쌓이는 시간이 더 빠른 것이다. 고정 풀 전략의 큐 사이즈는 무한이다.
- 사용자가 적은 서비스 초기에는 문제가 없지만 사용자가 늘어나거나 갑작스런 요청 증가 땐 문제가 발생한다.
    
### 14-1-2. Executor 전략 - 캐시 풀 전략

#### newCachedThreadPool()

- 기본 스레드를 사용하지 않고, 60초 생존 주기를 가진 초과 스레드만 사용한다.
- 초과 스레드의 수는 제한이 없다.
- 큐에 작업을 저장하지않는다.(SynchronousQueue)
  - 대신에 생산자의 요청을 스레드 풀의 소비자 스레드가 직접 받아서 바로 처리한다.
- 모든 요청이 대기하지 않고 스레드가 바로바로 처리해서 빠른 처리가 가능하다.
   
#### SynchronousQueue

- BlockingQueue 인터페이스의 구현체 중 하나이다.
- 이 큐는 내부에 저장 공간이 없다. 대신 생산자의 작업을 소비자 스레드에게 직접 전달한다.
- 생산자 스레드는 큐가 작업을 전달하면 소비자 스레드가 큐에서 작업을 꺼낼 때 까지 대기한다.
- 소비자 작업을 요청하면 기다리던 생산자가 소비자에게 직접 작업을 전달하고 반환된다.
- 생산자와 소비자를 동기화 하는 큐이다. 중간에 버퍼를 두지 않는 스레드 간 직거래라고 생각하면 된다.
   
```java
public class PoolSizeMainV3 {

    public static void main(String[] args) {
        // ExecutorService es = Executors.newCachedThreadPool();
        // keepAliveTime 60s -> 3s 로 조절
        ThreadPoolExecutor es = new ThreadPoolExecutor(0, Integer.MAX_VALUE, 3, TimeUnit.SECONDS, new SynchronousQueue<>());
        log("pool 생성");
        printState(es);

        for (int i = 1; i <= 4; i++) {
            String taskName = "task" + i;
            es.execute(new RunnableTask(taskName));
            printState(es, taskName);
        }
        
        sleep(3000);
        log("== 작업 수행 완료 ==");
        printState(es);

        sleep(3000);
        log("== maximumPoolSize 대기 시간 초과 ==");
        printState(es);

        es.close();
        log("== shutdown 완료 ==");
        printState(es);
    }
}
```

#### 특징

캐시 스레드 풀 전략은 매우 빠르고 유연한 전략이다.   
이 전략은 기본 스레드도 없고, 대기 큐에 작업이 쌓이지 않는다. 대신 작업 요청이 오면 초과 스레드로 작업을 바로바로 처리한다. 따라서 빠른 처리가 가능하다.    
초과 스레드의 수도 제한이 없기 때문에 CPU, 메모리 자원만 허용 한다면 시스템의 자원을 최대로 사용할 수 있다.   
초과 스레드는 60초 간 생존하기 때문에 작업 수에 맞춰 적절한 수의 스레드가 재사용된다.    
이런 특징 때문에 요청이 갑자기 증가하면 스레드도 갑자기 증가하고, 요청이 줄어들면 스레드도 점점 줄어든다.    
  
#### 주의
이 방식은 작업 수에 맞춰 스레드 수가 변하기 때문에, 작업의 처리 속도가 빠르고 CPU, 메모리를 매우 유연하게 사용할 수 있다는 장점이 있다.    
하지만 상황에 따라서 큰 단점이 되기도 한다.   
   
#### 상황1 - 점진적인 사용자 확대

- 개발한 서비스가 잘 되어서 사용자가 점점 늘어난다.
- 캐시 스레드 전략을 사용하면 이런 경우 크게 문제가 되지 않는다.
- CPU, 메모리 자원은 한계가 있기 때문에 적절한 시점에 시스템을 증설해야 한다. 그렇지 않으면 시스템 자원을 너무 많이 사용해서 시스템이 다운될 수 있다.
   
#### 상황2 - 갑작스런 요청 증가

- 마케팅 팀의 이벤트가 성공 하면서 갑자기 사용자가 폭증했다.
- 고객은 응답을 받지 못한다고 항의한다.
   
#### 상황2 - 확인

- 개발자는 CPU, 메모리 사용량을 확인해보니 CPU 사용량이 100%이고, 메모리 사용량도 지나치게 높아져있다.
- 스레드 수를 확인해보니 스레드가 수 천개 실행되고 있다. 너무 많은 스레드가 작업을 처리하면서 시스템 전체가 느려지는 현상이 발생한다.
- 캐시 스레드 풀 전략은 스레드가 무한으로 생성될 수 있다.
- 수 천개의 스레드가 처리하는 속도 보다 더 많은 작업이 들어오면 시스템은 너무 많은 스레드 잠식 당해 다운되어 시스템이 멈추는 장애가 발생할 수 있다.
   
### 14-1-3. Executor 전략 - 사용자 정의 풀 전략

다음과 같이 세분화된 전략을 사용하면 사용자가 점진적으로 확대되는 현상이나 갑작스럽게 요청이 증가되는 현상을 어느정도 대응할 수 있다.   
- 일반: 일반적인 상황에는 CPU, 메모리 자원을 예층할 수 있도록 고정 크기의 스레드로 서비스를 안정적으로 운영한다.
- 긴급: 사용자의 요청이 갑자기 증가하면 긴급하게 스레드를 추가로 투입해서 작업을 빠르게 처리한다.
- 거절: 사용자의 요청이 폭증해서 긴급 대응이 어렵다면 사용자의 요청을 거절한다.

<br/>

사용자의 요청이 갑자기 증가하면 긴급하게 스레드를 더 투입해야 한다.    
물론 긴급 상황에 CPU, 메모리 자원을 더 사용하기 때문에 사전에 부하 테스트를 통해 적정 수준을 찾아야 한다.   
시스템이 감당할 수 없을 정도로 사용자의 요청이 폭증하면, 처리 가능한 수준의 사용자 요청만 처리하고 나머지 요청은 거절해야 한다.   
어떤 경우에도 시스템이 다운되는 최악의 상황은 피해야한다.   

```java
ExecutorService es = new ThreadPoolExecutor(100, 200, 60, TimeUnit.SECONDS, new ArrayBlockingQueue<>(1000));
```

- 100개의 기본 스레드를 사용한다.
- 긴급 대응 가능한 추가 스레드 100개를 사용한다. 추가 스레드는 60초의 생존 주기를 가진다.
- 1000개의 작업이 큐에 대기할 수 있다.
   
```java
public class PoolSizeMainV4 {

    static final int TASK_SIZE = 1100; // 1. 일반
//    static final int TASK_SIZE = 1200; // 2. 긴급
//    static final int TASK_SIZE = 1201; // 3. 거절

    public static void main(String[] args) {
        ExecutorService es = new ThreadPoolExecutor(100, 200, 60, TimeUnit.SECONDS, new ArrayBlockingQueue<>(1000));
        printState(es);

        long startMs = System.currentTimeMillis();

        for (int i = 1; i <= TASK_SIZE; i++) {
            String taskName = "task" + i;
            try {
                es.execute(new RunnableTask(taskName));
                printState(es, taskName);
            } catch (RejectedExecutionException e) {
                log(taskName + " -> " + e);
            }
        }

        es.close();
        long endMs = System.currentTimeMillis();
        log("time: " + (endMs - startMs));
    }
}
```

- 일반: 1000개 이하의 작업이 큐에 담겨있다. → 100개의 기본 스레드가 처리한다.
  - 작업을 모두 처리하는데 11초가 걸린다. 1100 / 100 → 11초
- 긴급: 큐에 담긴 작업이 1000개를 초과한다. → 100개의 기본 스레드 + 100개의 초과 스레드가 처리한다.
  - 최대 1000개의 작업이 대기하고 200개의 작업이 실행 중일 수 있다.
  - 작업을 모두 처리하는데 6초가 걸린다. 1200 / 200 → 6초
  - 긴급 투입한 스레드 덕분에 풀의 스레드 수가 2배가 된다. 따라서 작업을 2배 빠르게 처리한다.
  - CPU, 메모리 리소스 사용은 일반 때 보다 늘어난다.
- 거절: 초과 스레드를 투입 했지만, 큐에 담긴 작업 1000개를 초과하고 또 초과 스레드도 넘어간 상황이다. 이 경우 예외를 발생시킨다.
  - 추가 스레드로 작업이 빠르게 소모되지 않는다는 것은 시스템이 감당하기 어려운 많은 요청이 들어오고 있다는 의미이다.
  - 여기서는 총 1200개의 작업을 초과하면 예외가 발생한다.
  - 따라서 1201번에서 예외가 발생한다.
  - 이런 경우 요청을 거절하고 나중에 다시 시도해 달라고 해야 한다.
   
#### 실무에서 자주 하는 실수

```java
new ThreadPoolExecutor(100, 200, 60, TimeUnit.SECONDS, new LinkedBlockingQueue());
```

- 기본 스레드 100개
- 최대 스레드 200개
- 큐 사이즈: 무한대
   
이렇게 설정하면 큐 사이즈가 무한대 이므로 절대로 최대 사이즈 만큼 풀에 있는 스레드가 늘어나지 않는다.   

## 14-2. Executor 예외 정책

소비자가 처리할 수 없을 정도로 생산 요청이 가득 차는 경우 요청을 거절하는 정책이 필요하다.   
ThreadPoolExecutor에 작업을 요청할 때, 큐도 가득차고, 초과 스레드도 더는 할당할 수 없다면 작업을 거절한다.   
ThreadPoolExecutor를 shutdown()하면 이후 요청하는 작업을 거절하는데 이 때도 같은 정책이 적용된다.
ThreadPoolExecutor는 작업을 거절하는 4가지 정책을 제공한다.   

<br/>

- AbortPolicy: 새로운 작업을 제출할 때 RejectedExecutionException을 발생시킨다. 디폴트 정책이다.
- DiscardPolicy: 새로운 작업을 알리지 않고 버린다.
- CallerRunsPolicy: 새로운 작업을 제출한 스레드가 대신해서 작업을 실행한다.
- 사용자(RejectedExecutionHandler): 개발자가 직접 정의한 거절 정책을 사용할 수 있다.

#### AbortPolicy

작업이 거절되면 RejectedExecutionException을 던진다. 디폴트로 설정되어 있는 정책이다.   
RejectedExecutionException 예외를 잡아서 작업을 포기하거나, 사용자에게 알리거나, 다시 시도한다.   

```java
public class RejectMainV1 {

    public static void main(String[] args) {
        ExecutorService executor = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS, new SynchronousQueue<>(), new ThreadPoolExecutor.AbortPolicy());

        executor.submit(new RunnableTask("task1"));

        try {
            executor.submit(new RunnableTask("task2"));
        } catch (RejectedExecutionException e) {
            log("요청 초과");

            log(e);
        }

        executor.shutdown();
    }
}
```

#### RejectedExecutionHandler

AbortPolicy는 RejectedExecutionHandler의 구현체이다.   
ThreadPoolExecutor는 거절해야 하는 상황이 발생하면 여기에 있는 rejectedExecution()을 호출한다.   

```java
public interface RejectedExecutionHandler {
  void rejectedExecution(Runnable r, ThreadPoolExecutor executor);
}

public static class AbortPolicy implements RejectedExecutionHandler {

  public void rejectedExecution(Runnable r, ThreadPoolExecutor e) {
    throw new RejectedExecutionException("Task " + r.toString() + " rejected from " + e.toString());
 }
}
```

#### DiscardPolicy

거절된 작업을 무시하고 아무런 예외도 발생시키지 않는다.   

```java
public class RejectMainV2 {

    public static void main(String[] args) {
        ExecutorService executor = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS, new SynchronousQueue<>(), new ThreadPoolExecutor.DiscardPolicy());

        executor.submit(new RunnableTask("task1"));
        executor.submit(new RunnableTask("task2"));
        executor.submit(new RunnableTask("task3"));
        executor.close();
    }
}
```

```java
public static class DiscardPolicy implements RejectedExecutionHandler {
  public void rejectedExecution(Runnable r, ThreadPoolExecutor e) {
    // empty
  }
}
```

#### CallerRunsPolicy

작업을 호출한 스레드가 직접 작업을 수행한다. 이로 인해 새로운 작업을 제출하는 스레드의 속도가 느려질 수 있다.   
이 정책은 생산자 스레드가 대신 일을 수행하기 때문에 작업의 생산 자체가 느려진다.    
아래 코드에서 CallerRunsPolicy 정책 덕분에 main 스레드는 task2를 본인이 직접 완료하고 나서야 task3를 생산할 수 있다.    
결과적으로 생산 속도가 조절되었다.   

```java
public class RejectMainV3 {

    public static void main(String[] args) {
        ExecutorService executor = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS, new SynchronousQueue<>(), new ThreadPoolExecutor.CallerRunsPolicy());

        executor.submit(new RunnableTask("task1"));
        executor.submit(new RunnableTask("task2"));
        executor.submit(new RunnableTask("task3"));
        executor.submit(new RunnableTask("task3"));
        executor.close();
    }
}
```

```java
public static class CallerRunsPolicy implements RejectedExecutionHandler {
  public void rejectedExecution(Runnable r, ThreadPoolExecutor e) {
    if (!e.isShutdown()) {
      r.run();
    }
  }
}
```

#### 사용자 정의

사용자는 RejectedExecutionHandler 인터페이스를 구현해 자신만의 거절 처리 전략을 만들 수 있다.

```java
public class RejectMainV4 {

    public static void main(String[] args) {
        ExecutorService executor = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS, new SynchronousQueue<>(), new MyRejectedExecutionHandler());

        executor.submit(new RunnableTask("task1"));
        executor.submit(new RunnableTask("task2"));
        executor.submit(new RunnableTask("task3"));

        executor.close();
    }

    static class MyRejectedExecutionHandler implements RejectedExecutionHandler {

        static AtomicInteger count = new AtomicInteger(0);

        @Override
        public void rejectedExecution(Runnable r, ThreadPoolExecutor executor) {
            int i = count.incrementAndGet();
            log("[경고] 거절된 누적 작업 수: " + i);
        }
    }
}
```
