---
layout: post
title: 자바의 비동기 기술
date: 2021-04-19 21:00:00 + 0900
categories: Java
ref: Java, Asynchronous, Future
---

출처: https://gunju-ko.github.io/java/2018/07/05/Future.html   
출처: https://codechacha.com/ko/java-completable-future/   
출처: https://jongmin92.github.io/2019/03/31/Java/java-async-1/   

# 자바의 비동기 기술

## 1. ExecutorService
  ExecutorService 는 비동기로 작업을 실행할 수 있도록 Therad 의 라이프 사이클 등 low level 의 고려사항들을 추상화 한 인터페이스 이다.   
  ThreadPool 을 이용해 지정된 Task 를 실행하고 Task 는 큐로 관리되어 ThreadPool 에 할당되지 못한 Task 는 큐에서 기다린다.   
  
  ```java
  @Slf4j
  public class FutureEx {
    public static void main(String[] args) {
      ExecutorService es = Executors.newCachedThreadPool();
      es.execute(() -> {
        try {
          Thread.sleep(2000);
        } catch (InterruptedException e) {}
        log.info("Async");
      });
      log.info("Exit");  
    }
  }
  
  // 결과
  20:35:53.892 [main] INFO com.example.study.FutureEx - Exit  
  20:35:55.888 [pool-1-thread-1] INFO com.example.study.FutureEx - Async
  ```
  
## 2. Future
  Future 는 비동기 계산의 결과를 나타내는 Interface 이다. Java 에서 비동기 작업을 수행한다는 것은   
  현재 진행 중인 스레드가 아닌 별도의 스레드에서 작업을 수행한다는 의미이다.   
  비동기 작업에서 결과를 반환하고 싶을 때는 runnable 대신 callable interface 를 이용하면 결과 값을 사용하면 결과 값을 return 할 수 있다.   
  그리고 예외를 비동기 코드를 처리하는 스레드 안에서 처리하지 않고 밖으로 던질 수 있다.   
      
### 2-1. Future 에서 제공하는 메소드
  - V get() : Callable 등 작업의 실행이 완료될 때 까지 블로킹되고 완료되면 결과값을 리턴한다.
  - V get(long timeut, TimeUnit unit) : 인수로 전달한 시간동안 작업의 실행 결과를 기다린다. 지정한 시간 내에 수행이 완료되면 결과를 리턴하고 초과되면 TimeoutException 을 발생시킨다.
  - boolean cancel(boolean mayInterruptIfRunning) : 작업을 취소하려고 시도한다. 작업이 이미 완료되거나 취소되면 실패할 수 있다. cancel 이 리턴된 이후에 isDone() 은 항상 true 를 반환한다.
  - boolean isCancelled() : 작업이 정상적으로 완료가 되기 전 취소되면 true 를 리턴한다.
  - boolean isDone() : 작업이 완료된 경우 true 를 리턴한다.
    
  ```java
  @slf4j
  public class FutureEx {
    public static void main(String[] args) throws ExecutionException, InterruptedException {
      ExecutorService es = Executors.newCachedThreadPool();
      Future<String> f = es.submit(() -> {
        Thread.sleep(2000);
        logger.info("Async");
        return "Hello";
      });
      logger.info("Start");
      logger.info(f.get());
      logger.info("Exit");
    }
  }
  
  // 결과 
  18:29:47.653 [main] async.future.FutureTest2 - Start
  18:29:49.667 [pool-1-thread-1] async.future.FutureTest2 - Async
  18:29:49.667 [main] async.future.FutureTest2 - Hello
  18:29:49.668 [main] async.future.FutureTest2 - Exit
  ```
  
  Future 로 비동기 작업의 결과를 가져올 때는 get 메서드를 사용한다.   
  get 메서드를 사용하면 비동기 작업이 완료될 때 까지 해당 스레드가 blocking 된다.   
  Future 는 완료를 기다리고 계산 결과를 반환하는 get 메소드와 연산이 완료 되었는지 확인하는 isDone 메소드를 제공한다.
    
  ```java
  @slf4j
  public class FutureEx {
    public static void main(String[] args) throws ExecutionException, InterruptedException {
      ExecutorService es = Executors.newCachedThreadPool();
      
      Future<String> f = es.submit(() -> {
        Thread.sleep(2000);
        log.info("Async");
        return "Hello";
      });
      log.info(String.valueOf(f.isDone()));
      Thread.sleep(2000);
      log.info("Exit");
      log.info(String.valueOf(f.isDone()));
      log.info(f.get());
    }
  }
  
  // 결과
  00:26:00.501 [main] INFO com.example.study.FutureEx - false
  00:26:02.502 [pool-1-thred-1] INFO com.example.study.FutureEx - Async
  00:26:02.509 [main] INFO com.example.study.FutureEx - Exit
  00:26:02.509 [main] INFO com.example.study.FutureEx - true
  00:26:02.509 [main] INFO com.example.study.FutureEx - Hello
  ```
    
## 3. FutureTask
  FutureTask 는 비동기 작업을 생성한다. 비동기 작업 생성과 실행을 동시에 한 위의 코드와 다르게   
  비동기 작업의 생성과 실행을 분리해 진행할 수 있다.
   
```java
@slf4j
public class FutureEx {
  public static void main(String[] args) throws ExecutionException, InterruptedException {
    ExecutorService es = Executors.newCachedThreadPool();
     
    FutureTask<String> f = new FutureTask<>(() -> {
      Thread.sleep(2000);
      log.info("Async");
      return "Hello";
    });
    
    es.execute(f);
    
    log.info(String.valueOf(f.isDone()));
    Thread.sleep(2000);
    log.info("Exit");
    log.info(String.valueOf(f.isDone()));
    log.info.(f.get());
  }
}
 
// 결과
00:29:39.459 [main] INFO com.example.study.FutureEx - false
00:29:41.461 [pool-1-thread-1] INFO com.example.study.FutureEx - Async
00:29:41.467 [main] INFO com.example.study.FutureEx - Exit
00:29:41.467 [main] INFO com.example.study.FutureEx - true
00:29:41.467 [main] INFO com.example.study.FutureEx - Hello
```
 
비동기 작업의 결과를 가져오는 방법은 Future 와 같은 결과를 다루는 handler 를 이용하거나 callback 을 이용하는 2 가지 방법이 있다.
 
### 3-1. done() 메소드를 재정의 해 callback 을 이용하는 방법
```java
@slf4j
public class FutureEx {
  public static void main(String[] args) {
    ExecutorService es = Executors.newCachedThreadPool();
    
    FutureTask<String> f = new FutureTask<String>(() -> {
      Thread.sleep(2000);
      log.info("Async");
      return "Hello";
    }) {
      @Override
      protected void done() {
        super.done();
        try {
          log.info(get());
        } catch (InterruptedException e) {
          e.printStackTrace();
        } catch (ExecutionException e) {
          e.printStackTrace();
        }
      }
    };
    
    es.execute(f);
    es.shutdown();
    
    log.info("EXIT");
  }
}

// 결과
01:03:04.153 [main] INFO com.example.study.FutureEx - EXIT
01:03:06.153 [pool-1-thread-1] INFO com.example.study.FutureEx - Async
01:03:06.153 [pool-1-thread-1] INFO com.example.study.FutureEx - Hello
```
      
### 3-2. callback 을 좀 더 가독성 있게 작성 
```java
@slf4j
public class FutureEx {
  interface SuccessCallback {
    void onSuccess(String result);
  }
  
  public static class CallbackFutureTask extends FutureTask<String> {
    SuccessCallback sc;
    
    public CallbackFutureTask(Callable<String> callable, SuccessCallback sc) {
      super(callable);
      this.sc = Objects.requireNonNull(sc);
    }
  
    @Override
    protected void done() {
      super.done();
      try {
        this.sc.onSuccess(get());
      } catch (InterruptedException e) {
        e.printStackTrace();        
      } catch (ExecutionException e) {
        e.printStackTrace();
      }
    }
  }
  
  public static void main(String[] args) {
    ExecutorService es = Executors.newCachedThreadPool();
    
    CallbackFutureTask f = new CallbackFutureTask(() -> {
      Thread.sleep(2000);      
      log.info("Async");
      return "Hello";
    }, log::info);
    
    es.execute(f);
    es.shutdown();
  }
}

// 결과
01:05:01.978 [main] INFO com.example.study.FutureEx - EXIT
01:05:03.977 [pool-1-thread-1] INFO com.example.study.FutureEx - Async
01:05:03.978 [pool-1-thread-1] INFO com.example.study.FutureEx - Hello
```
   
### 3-3. 예외처리 Callback 추가
```java
@slf4j
public class FutureEx {
  interface SuccessCallback {
    void onSuccess(String result);
  }
  
  interface ExceptionCallback {
    void onError(Throwable t);
  }
  
  public static class CallbackFutureTask extends FutureTask<String> {
    SuccessCallback sc;
    ExceptionCallback ec;
    
    public CallbackFutureTask(Callable<String> callable, SuccessCallback sc, ExceptionCallback ec) {
      super(callable);
      this.sc = Objects.requireNonNull(sc);
      this.ec = Objects.requireNonNull(ec);
    }
  
    @Override
    protected void done() {
      super.done();
      try {
        this.sc.onSuccess(get());
      } catch (InterruptedException e) {
        Thread.currentRhread().interrupt();
      } catch (ExecutionException e) {
        ec.onError(e.getCause());
      }
    }
  }
  
  public static void main(String[] args) {
    ExecutorService es = Executors.newCachedThreadPool();
    
    CallbackFutureTask f = new CallbackFutureTask(() -> {
      Thread.sleep(2000);      
      if (1 == 1) throw new RuntimeException("Async Error");
      log.info("Async");
      return "Hello";
    },
    s -> log.info("Result: {}", s),
    e -> log.info("Error: {}", e.getMessage()));
    
    es.execute(f);
    es.shutdown();
    log.info("EXIT");
  }
}

// 결과
01:11:53.460 [main] INFO com.example.study.FutureEx - EXIT
01:11:53.463 [pool-1-thread-1] INFO com.example.study.FutureEx - Error: Async Error
```

## 4. CompletableFuture
  CompletableFuture 를 사용하면 Future 를 명시적으로 완료할 수 있다.    
  만약 2개 이상의 스레드에서 CompletableFuture 에 결과를 쓰려고 하는 경우(complete, completeExceptionally, cancel) 에는 그 중 1개의 스레드만 성공한다.   
  CompletableFuture 는 Future, CompletionStage 인터페이스를 구현한다.

### 4-1. CompletionStage 인터페이스를 다음과 같은 정책으로 구현하고 있다.   
  - 비동기 처리가 완료되었을 때 수행되는 의존적인 작업들은 CompletableFuture 를 완료한 스레드에 의해 실행될 수 있다.    
  CompletableFuture 가 이미 완료된 경우에는 콜백을 등록하는 스레드에서 해당 콜백을 실행한다.
  - 명시적으로 Executor 인자를 받지 않는 비동기 메소드들은 ForkJoinPool.commonPool() 에서 스레드를 할당받아 수행된다.   
  AsynchronouseCompletionTask 는 async 메소드에 의해 생성된 비동기 task 들을 식별하기 위한 마커 인터페이스 이다.
  - 모든 CompletionStage 메소드들은 다른 public 메소드와 독립적으로 구현되어 있다. 따라서 서브 클래스에서 특정 메소드를 오버라이드 했다 하더라도 CompletionStage 메소드에 영향을 주지 않는다.
   
### 4-2. CompletableFuture 는 다음과 같은 정책으로 Future 인터페이스를 구현하고 있다.
  - Future 인터페이스는 비동기 작업을 완료시킬 수 있는 메소드를 가지고 있지 않다.   
  cancel() 메소드는 completeExceptionally 와 같은 효과를 가진다.   
  isCompletedExceptionally() 메소드는 CompletableFuture 가 예외적인 방식으로 완료되었는지 확인하는데 사용될 수 있다.
  - CompletionException 에 의해 예외적으로 완료가 된 경우, get() 또는 get(long, TimeUnit) 메소드는 ExecutionException 을 던진다.
  
### 4-3. CompletableFuture 에서 제공하는 메소드   
  - CompletableFuture`<U`> completedFuture(U value) : 이미 비동기 작업이 완료된 상태의 CompletableFuture 를 반환한다.
  - boolean complete(T value) : 이미 완료가 되지 않은 경우 비동기 결과를 value 로 쓰고 완료 상태로 변환한다. get 메소드를 호출하는 경우 get() 메소드의 결과로 value 가 리턴된다.
  - boolean completeExceptionally(Throwable x) : 이미 완료되지 않은 경우 예외적으로 완료되었다고 상태를 변환한다. get 메소드를 호출하는 경우 예외가 발생한다.

```java
public class FutureEx {
  public static void log(String msg) {
    System.out.println(LocalTime.now() + " (" + Thread.currentThread().getName() + ") " + msg);
  }
  
  public static void main(String[] args) {
    CompletableFuture<String> future = new CompletableFuture<>();
    Executors.newCachedThreadPool().submit(() -> {
      Thread.sleep(2000);
      future.complete("Finished");
      return null;
    });
    log(future.get());
  }
}

// 결과
22:58:40.478 (main) Finished
```
  
### 4-4. cancel 에 대한 예외처리
```java
public class FutureEx {
  public static void log(String msg) {
    System.out.println(LocalTime.now() + " (" + Thread.currentThread().getName() + ") " + msg);
  }
  
  public static void main(String[] args) {
    CompletableFuture<String> future = new CompletableFuture<>();
    Executors.newCachedThreadPool().submit(() -> {
      Thread.sleep(2000);
      future.cancel(false);
      return null;
    });
    
    String result = null;
    try {
      result = future.get();
    } catch (CancellationException e) {
      e.printStackTrace();
      result = "Canceled";
    }
    
    log(result);
  }
}

// 결과
java.util.concurrent.CancellationException 	
  at java.util.concurrent.CompletableFuture.cancel(CompletableFuture.java:2276) 	
  at CompletableFutureExample.lambda$ex3$1(CompletableFutureExample.java:47) 	
  at java.util.concurrent.FutureTask.run(FutureTask.java:266) 	
  at java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1149) 	
  at java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:624) 	
  at java.lang.Thread.run(Thread.java:748) 23:02:53.074 (main) Canceled
```

### 4-5. supplyAsync(), runAsync()
  CompletableFuture 는 supplyAsync() 와 runAsync() 를 제공해 직접 스레드를 생성하지 않고 작업을 Async 로 처리할 수 있다.   
  supplyAsync() 는 리턴 값이 있는 반면에 runAsync() 는 리턴 값이 없다.

```java
public class FutureEx {
  public static void log(String msg) {
    System.out.println(LocalTime.now() + " (" + Thread.currentThread().getName() + ") " + msg);
  }
  
  public static void main(String[] args) {
    CompletableFuture<String> future = new CompletableFuture.supplyAsync(() -> {
      log("Start");
      try {
        Thread.sleep(2000);
      } catch (InterruptedException e) {
        e.printStackTrace();
      }
      return "Finished works";
    });
    
    log("get(): " + future.get());
  }
}

// 결과
15:46:09.715 (ForkJoinPool.commonPool-worker-1) Start
15:46:11.716 (main) get(): Finished works
```

```java
public class FutureEx {
  public static void log(String msg) {
    System.out.println(LocalTime.now() + " (" + Thread.currentThread().getName() + ") " + msg);
  }
  
  public static void main(String[] args) {
    CompletableFuture<void> future = new CompletableFuture.runAsync(() -> log("get(): " + future.get());
  }
}

// 결과
15:47:01.328 (ForkJoinPool.commonPool-worker-1) future example
15:47:01.328 (main) get(): null
```
#### thenApply() : 리턴 값이 있는 작업 수행

#### thenAccept() : 리턴 값이 없는 작업 수행

#### thenCompose() : 여러 작업을 순차적으로 수행

#### thenCombine() : 여러 작업을 동시에 수행

#### anyOf() : 여러 개의 CompletableFuture 중 빨리 처리되는 1개의 결과만을 가져온다.

#### allOf() : 모든 future 의 결과를 받아서 처리
