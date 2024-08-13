---
layout: post
title: Java 스레드7 - 스레드 풀과 Executor 프레임워크1
date: 2024-08-15 01:00:00 + 0900
categories: Java
ref: Java, thread, multi-thread, thread pool, executor
---

### 강의 : [김영한의 실전 자바 - 고급 1편, 멀티스레드와 동시성](https://www.inflearn.com/course/%EA%B9%80%EC%98%81%ED%95%9C%EC%9D%98-%EC%8B%A4%EC%A0%84-%EC%9E%90%EB%B0%94-%EA%B3%A0%EA%B8%89-1/dashboard)

# 12. 스레드 풀과 Executor 프레임워크1

## 12-1. 스레드를 직접 사용할 때의 문제점

스레드를 직접 생성해서 사용하면 다음과 같은 3가지 문제가 있다.
- 스레드 생성 시간으로 인한 성능 문제
- 스레드 관리 문제
- Runnable 인터페이스의 불편함
   
**1. 스레드 생성 비용으로 인한 성능 문제**   
스레드를 사용하기 위해 생성해야 하는데, 스레드는 다음과 같은 이유로 매우 무겁다.   
참고로 스레드 하나는 보통 1MB 이상의 메모리를 사용한다.   
- 메모리 할당: 각 스레드는 자신만의 콜 스택을 가지고 있어야 한다. 콜 스택은 스레드가 실행되는 동안 사용하는 메모리 공간이다. 따라서 콜 스택을 위한 메모리를 할당해야 한다.
- 운영체제 자원 사용: 스레드를 생성하는 작업은 커널 수준에서 이뤄지며, 시스템 콜을 통해 처리된다. 이는 CPU와 메모리 리소스를 소모하는 작업이다.
- 운영체제 스케줄러 설정: 새로운 스레드가 생성되면 운영체제의 스케줄러는 이 스레드를 관리하고 실행 순서를 조정해야 한다.
   
스레드를 생성하는 작업은 단순히 자바 객체를 생성하는 것과는 비교할수 없을 정도로 큰 작업이다.   
만약 작업을 수행할 때 마다 스레드를 생성하고 실행한다면 스레드의 생성 비용에 작업보다 많은 시간과 리소스가 사용될 수 있다.   
이런 문제를 해결하려면 생성한 스레드를 재사용하는 방법을 고려할 수 있다.    
   
**2. 스레드 관리 문제**   
서버의 CPU, 메모리 자원은 한정되어 있기 때문에, 스레드는 무한하게 만들 수 없다.   
그래서 서버나 시스템이 버틸 수 있는 최대 스레드 수 까지만 스레드를 생성할 수 있게 관리해야 한다.   
그리고 실행 중인 스레드가 남은 작업을 모두 수행한 다음 프로그램을 종료하거나 급하게 종료하고 싶다 할 때,    
스레드가 어딘가에 관리가 되어 있어야한다.   
   
**3. Runnable 인터페이스의 불편함**    
- 반환 값이 없다: run() 메서드는 반환 값을 가지지 않아서 직접 받을 수 없다. 따라서 실행 결과를 얻기 위해서는 별도의 메커니즘을 사용해야 한다. 스레드가 실행한 결과를 멤버 변수에 넣어두고, join() 등을 사용해서 스레드가 종료되길 기다린 다음에 멤버 변수에 보관한 값을 받아야 한다.   
- 예외 처리: run() 메서드는 체크 예외를 던질 수 없어서 메서드 내부에서 처리하는 것이 강제된다.   
    
이런 문제를 해결하려면 반환 값을 받을 수 있고 예외를 더 쉽게 처리하는 스레드 풀이 필요하다.   
이 문제를 해결해주는 것이 자바가 제공하는 Executor 프레임워크다.   
Executor 프레음워크는 스레드 풀, 스레드 관리, Runnable의 문제점 뿐만 아니라 생산자 소비자 문제까지 한 번에 해결해주는 자바 멀티스레드 도구이다.   

## 12-2. Executor 프레임워크 소개

Executor 프레임워크의 주요 구성 요소   

```java
package java.util.concurrent;

public interface Executor {
    void execute(Runnable command);
}
```

ExecutorService 인터페이스 - 주요 메서드     
ExecutorService 인터페이스의 기본 구현체는 ThreadPoolExecutor 이다.   
```java
public interface ExecutorService extends Executor, AutoCloseable {
    <T> Future<T> submit(Callable<T> task);

    @Override
    default void close() { ... }
}
```
   
ExecutorService 코드   

```java
public class RunnableTask implements Runnable {
    private final String name;
    private int sleepMs = 1000;

    public RunnableTask(String name) {
        this.name = name;
    }

    public RunnableTask(String name, int sleepMs) {
        this.name = name;
        this.sleepMs = sleepMs;
    }

    @Override
    public void run() {
        log(name + " 시작");
        sleep(sleepMs);
        log(name + " 완료");
    }
}

public class ExecutorBasicMain {

    public static void main(String[] args) throws InterruptedException {

        ExecutorService es = new ThreadPoolExecutor(2, 2, 0, TimeUnit.MILLISECONDS, new LinkedBlockingQueue<>());
        log("== 초기 상태 ==");
        printState(es);
        es.execute(new RunnableTask("taskA"));
        es.execute(new RunnableTask("taskB"));
        es.execute(new RunnableTask("taskC"));
        es.execute(new RunnableTask("taskD"));
        log("== 작업 수행 중 ==");
        printState(es);

        sleep(3000);
        log("== 작업 수행 완료 ==");
        printState(es);

        es.shutdown();
        log("== shutdown 완료 ==");
        printState(es);
    }
}
```
    
ThreadPoolExecutor(ExecutorService) 는 크게 스레드를 관리하는 스레드 풀과 작업을 보관할 BlockingQueue 로 구성되어 있다.   
ThreadPoolExecutor 생성자는 다음 속성을 사용한다.   
- corePoolSize: 스레드 풀에서 관리되는 기본 스레드의 수
- maximumPoolSize: 스레드 풀에서 관리되는 최대 스레드 수
- keepAliveTime, TimeUnit, unit: 기본 스레드 수를 초과해서 만들어진 스레드가 생존할 수 있는 대기 시간이다. 이 시간 동안 처리할 작업이 없다면 초과 스레드는 제거된다.   
- BlockingQueue workQueue: 작업을 보관할 블로킹 큐. LinkedBlockingQueue를 사용했는데, 이 블로킹 큐는 작업을 무한대로 저장할 수 있다.
    
## 12-3. Future1 - 소개

**Runnable 과 Callable 비교**   
```java
package java.lang;

public interface Runnable {
    void run();
}
```

- Runnable의 run()은 반환 타입이 void 라서 값을 반환할 수 없다.
- 예외가 선언되어 있지 않아 Runnable 을 구현하는 모든 메서드는 체크 예외를 던질 수 없다.
   
```java
package java.util.concurrent;

public interface Callable<V> {
    V call() throws Exception;
}
```
   
- Callable의 call()은 반환 타입이 제네렉 V라서 값을 반환할 수 있다.
- throws Exception 예외가 선언되어 있어 Callable 을 구현하는 모든 메서드는 체크 예외를 던질 수 있다.

**Callable과 Future사용**

```java
public class CallabeMainV1 {

    public static void main(String[] args) throws ExecutionException, InterruptedException {
        ExecutorService es = Executors.newFixedThreadPool(1);
        Future<Integer> future = es.submit(new MyCallable());
        Integer result = future.get();
        log("result value = " + result);
        es.shutdown();
    }

    static class MyCallable implements Callable<Integer> {

        @Override
        public Integer call() throws Exception {
            log("Callable 시작");
            sleep(2000);
            int value = new Random().nextInt(10);
            log("create value = " + value);
            log("Callable 완료");
            return value;
        }
    }
}
```
   
java.util.concurrent.Executors가 제공하는 newFixedThreadPool(size)를 사용하면 편리하게 ExecutorService를 생성할 수 있다.   
ExecutorService가 제공하는 submit()을 통해 Callable을 작업으로 전달할 수 있다.    
Runnable 코드와 비슷한데, 결과를 필드에 담아두는 것이 아니라, 결과로 반환한다는 점이 다르다.    
따라서 결과를 보관할 별도의 필드를 만들지 않아도 된다.    
Future.get()은 InterruptedException, ExecutionException 체크 예외를 던진다.   
요청 스레드가 결과를 반아야 하는 상황이라면, Callable을 사용한 방식은 Runnable을 사용하는 방식보다 훨씬 편리하다.    
   
## 12-4. Future2 - 분석

- submit()의 호출로 MyCallable의 인스턴스를 전달한다.
- MyCallable.call() 메서드는 호출 스레드가 실해앟는 것도 아니고, 스레드 풀의 다른 스레드가 실행하기 때문에 언제 실행이 완료되어서 결과를 반환할 지 알 수 없다.
- 결과를 즉시 받는 것을 불가능하기 때문에 es.submit()은 MyCallable의 결과를 반환하는 대신에 MyCallable의 결과를 나중에 받을 수 있는 Future 라는 객체를 대신 반환한다.

```java
public class CallableMainV2 {

    public static void main(String[] args) throws ExecutionException, InterruptedException {
        ExecutorService es = Executors.newFixedThreadPool(1);
        log("submit() 호출");
        Future<Integer> future = es.submit(new MyCallable());
        log("future 즉시 반환, future = " + future);

        log("future.get() [블로킹] 메서드 호출 시작 -> main 스레드 WAITING");
        Integer result = future.get();
        log("future.get() [블로킹] 메서드 호출 완료 -> , main 스레드 RUNNABLE");

        log("result value = " + result);
        log("future 완료, future = " + future);
        es.shutdown();
    }

    static class MyCallable implements Callable<Integer> {
        @Override
        public Integer call() throws Exception {
            log("Callable 시작");
            sleep(2000);
            int value = new Random().nextInt(10);
            log("create value = " + value);
            log("Callable 완료");
            return value;
        }
    }
}
```

ExecutorService는 MyCallale 인스턴스의 미래 결과를 알 수 있는 Future(FutureTask) 객체를 생성한다.   
그리고 생성한 Future 객체 안에 MyCallable 인스턴스를 보관한다.    
Future는 내부에 MyCallable 인스턴스 작업의 완료 여부와 작업의 결과 값을 가진다.   
MyCallable 인스턴스를 감싸고 있는 Future가 블로킹 큐에 담긴다.     
스레드 풀에 있는 스레드가 FutureTask 의 run()메서드를 수행한다.   
그리고 run() 메서드가 MyCallable 인스턴스의 call() 메서드를 호출하고 그 결과를 받아서 처리한다.   
es.submit(new MyCallable())을 호출하면 요청 스레드는 기다리지 않고 바로 Future 객체를 받는다.   
    
Thread.join(), Future.get()과 같은 메서드는 스레드가 작업을 바로 수행하지 않고, 다른 자업이 완료될 때까지 기다리게 하는 블로킹 메서드이다. 블로킹 메서드를 호출하면 호출한 스레드는 지정된 작업이 완료될 때까지 블록(대기) 되어 다른 작업을 수행할 수 없다.   
이 때 요청 스레드의 상태는 RUNNABLE → WAITING이 된다.    
   
MyCallable 인스턴스의 작업을 완료하면 요청 스레드를 깨워 WAITING → RUNNABLE 상태로 변한다.   
그리고 완료 상태의 Future 에서 결과를 반환 받는다.    

## 12-5. Future3 - 활용

아래 코드는 ExecutorService 와 Callable 을 활용해 1~100까지 더하는 경우를 스레드를 사용해 나누어 처리한다.   

```java
public class SumTaskMain {

    public static void main(String[] args) throws InterruptedException, ExecutionException {
        SumTask task1 = new SumTask(1, 50);
        SumTask task2 = new SumTask(51, 100);
        ExecutorService es = Executors.newFixedThreadPool(2);

        Future<Integer> future1 = es.submit(task1);
        Future<Integer> future2 = es.submit(task2);

        Integer sum1 = future1.get();
        Integer sum2 = future2.get();

        int summAll = sum1 + sum2;
        log("task1 + task2 = " + summAll);
        log("End");

        es.shutdown();
    }

    static class SumTask implements Callable<Integer> {
        int startValue;
        int endValue;

        public SumTask(int startValue, int endValue) {
            this.startValue = startValue;
            this.endValue = endValue;
        }

        @Override
        public Integer call() throws Exception {
            log("작업 시작");
            Thread.sleep(2000);
            int sum = 0;
            for (int i = startValue; i <= endValue; i++) {
                sum += i;
            }
            log("작업 완료 result=" + sum);
            return sum;
        };
    }
}
```

## 12-6. Future4 - 정리

**Future 인터페이스**   
```java
package java.util.concurrent;

pbulic interface Future<V> {
    
    boolean cancel(boolean mayInterruptIfRunning);
    boolean isCancelled();

    boolean isDone();

    V get() throws InterruptException, ExecutionException;
    V get(log timeout, TimeUnit unit) throws InterruptedException, ExecutionException, TimeoutException;

    enum State {
        RUNNIG,
        SUCCESS,
        FAILED,
        CANCELLED
    }

    default State state() {}
}
```

**주요 메서드**   
boolean cancel(boolean mayInterruptIfRunning)   
- 기능: 아직 완료되지 않은 작업을 취소한다.
- 매개변수: mayInterruptIfRunning
  - cancel(true): Future를 취소 상태로 변경한다. 작업이 실행 중이라면 Thread.interrupt()를 호출해서 작업을 중단한다.
  - cancel(false): Future를 취소 상태로 변경한다. 단 이미 실행 중인 작업을 중단하지는 않는다.
- 반환값: 작업이 성공적으로 취소된 경우 true, 이미 완료ㅕ되었거나 취소할 수 없는 경우 false
- 설명: 작업이 실행 중이 아니거나 아직 시작되지 ㅇ낳았음녀 취소하고, 실행 중인 작업의 경우 mayInterruptIfRunning이 treu 이면 중단을 시도한다.
- 참고: 취소 상태의 Future에 Future.get()을 호출하면 CancellationException 런타임 예외가 발생한다.
   
boolean isCancelled()
- 기능: 작업이 완료되었는지 여부를 확인한다.
- 반환값: 작업이 완료된 경우 true, 그렇지 않은 경우 false
- 설명: 작업이 정상적으로 완료되었거나, 취소되었거나 예외가 발생해 종료된 경우에 true를 반환한다.
   
State state()
- 기능: Future의 상태를 반환한다. 자바 19부터 지원한다.
  - RUNNING: 작업 실행 중
  - SUCCESS: 성공 완료
  - FAILED: 실패 완료
  - CANCELLED: 취소 완료
   
V get()
- 기능: 작업이 완료될 때까지 대기하고, 완료되면 결과를 반환한다.
- 반환값: 작업의 결과
- 예외
  - InterruptedException: 대기 중에 현재 스레드가 인터럽트된 경우 발생
  - ExecutionException: 작업 계산 중에 예외가 발생한 경우 발생
- 설명: 작업이 완료될 때까지 get()을 호출한 스레드를 블로킹한다. 작업이 완료되면 결과를 반환한다.
   
V get(long timeout, TimeUnit unit)
- 기능: get()과 같은데, 시간이 초과되면 예외를 발생시킨다.
- 예외
  - InterruptedException: 대기 중에 현재 스레드가 인터럽트된 경우 발생
  - ExecutionException: 작업 계산 중에 예외가 발생한 경우 발생
  - TimeoutException: 주어진 시간 내에 작어빙 완료되지 않은 경우 발생
- 설명: 지정된 시간 동안 결과를 기다린다. 시간이 초과되면 TimeoutException을 발생시킨다.
   
## 12-7. Future7 - 취소

