---
layout: post
title: Java 스레드8 - 스레드 풀과 Executor 프레임워크2
date: 2024-08-20 19:00:00 + 0900
categories: Java
ref: Java, thread, multi-thread, thread pool, executor
---

### 강의 : [김영한의 실전 자바 - 고급 1편, 멀티스레드와 동시성](https://www.inflearn.com/course/%EA%B9%80%EC%98%81%ED%95%9C%EC%9D%98-%EC%8B%A4%EC%A0%84-%EC%9E%90%EB%B0%94-%EA%B3%A0%EA%B8%89-1/dashboard)

# 13. 스레드 풀과 Executor 프레임워크2

## 13-1. ExecutorService 우아한 종료 - 소개

고객의 주문을 처리하는 서버를 운영 중이라고 가정한다.    
만약 서버 기능을 업데이트하기 위해 서버를 재시작해야 한다면,
서버가 고객의 주문을 처리하고 있는 도중에 갑자기 재시작 되면 고객의 주문이 제대로 진행되지 못할 것이다.    
이상적인 방법은 새로운 주문 요청은 막고 이미 진행 중인 주문은 모두 완료한 다음에 서버를 재시작하는 것이 가장 좋다.    
이렇게 문제 없이 종료하는 방식을 graceful shutdown 이라고 한다.    

**ExecutorService의 종료 메서드**   
- 서비스 종료
  - void shutdown()
    - 새로운 작업을 받지 않고 이미 제출된 작업을 모두 완료한 후에 종료한다.
    - 논 블로킹 메서드
  - List<Runnable> shutdownNow()
    - 실행 중인 작업을 중단하고, 대기 중인 작업을 반환하며 즉시 종료한다.
    - 실행 중인 작업을 중단하기 위해 인터럽트를 발생시킨다.
    - 논 블로킹 메서드
- 서비스 상태 확인
  - boolean isShutdown()
    - 서비스가 종료 되었는지 확인한다.
  - boolean isTerminated()
    - shutdown(), shutdownNow() 호출 후, 모든 작업이 완료 되었는지 확인한다.
- 작업 완료 대기
  - boolean awaitTermination(long timeout, TimeUnit unit) throws InterruptedException
    - 서비스 종료 시 모든 작업이 완료될 때까지 대기한다. 이 때 지정된 시간 까지만 대기한다.
    - 블로킹 메서드
- close()
  - 자바 19부터 지원하는 서비스 종료 메서드이다.
  - shutdown()을 호출하고 하루를 기다려도 작업이 완료되지 않으면 shutdownNow()를 호출해 즉시 종료한다.
   
**shutdown() - 처리 중인 작업이 없는 경우**   
- shutdown()을 호출하면 ExecutorService는 새로운 요청을 거절한다.
- 거절 시 RejectedExecutionException 예외가 발생한다.
- 스레드 풀의 자원을 정리한다.
   
**shutdown() - 처리 중인 작업이 없는 경우**    
- shutdown()을 호출하면 ExecutorService는 새로운 요청을 거절한다.
- 스레드 풀의 스레드는 처리 중인 작업을 완료한다.
- 스레드 풀의 스레드는 큐에 남아있는 작업도 모두 꺼내서 완료한다.
- 모든 작업을 완료하면 자원을 정리한다.
   
**shutdownNow() - 처리 중인 작업이 있는 경우**   
- shutdownNow()를 호출하면 ExecutorService는 새로운 요청을 거절한다.
- 큐를 비우면서 큐에 있는 작업을 모두 꺼내서 컬렉션으로 반환한다.
  - List<Runnable> runnables = es.shutdownNow()
- 작업 중인 스레드에 인터럽트가 발생한다.
- 작업을 완료하면 자원을 정리한다.
   
## 13-2. ExecutorService 우아한 종료 - 구현

갑자기 요청이 너무 많이 들어와서 큐에 대기 중인 작업이 너무 많아 작업 완료가 어렵거나, 작업이 너무 오래 걸리거나 또는 버그가 발생해서 특정 작업이 끝나지 않을 수 있다.    
이렇게 되면 서비스가 너무 늦게 종료 되거나 종료되지 않는 문제가 발생할 수 있다.   
   
이럴 때는 보통 우아하게 종료하는 시간을 정한다. 예를 들어 60초 까지는 기다렸다가 60초가 지나면 shutdownNow()를 호출해서 강제로 작업들을 종료한다.    
close()의 경우 이렇게 구현되어 있지만 하루를 기다리는 단점이 있다.    
ExecutorService 공식 API 문서에는 shutdown()을 통해 우하한 종료를 시도하고 n초간 종료되지 않으면 shutdownNow()를 통해 강제 종료하는 방식을 제안한다.    
아래 코드에서는 10초 동안 작업이 종료되길 기다린다.   

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

public class ExecutorShutdownMain {

    public static void main(String[] args) throws InterruptedException {
        ExecutorService es = Executors.newFixedThreadPool(2);
        es.execute(new RunnableTask("taskA"));
        es.execute(new RunnableTask("taskB"));
        es.execute(new RunnableTask("taskD"));
        es.execute(new RunnableTask("longTask", 100_000));
        printState(es);
        log("== shutdown 시작 ==");
        shutdownAndAwaitTermination(es);
        log("== shutdown 완료 ==");
        printState(es);
    }

    static void shutdownAndAwaitTermination(ExecutorService es) {
        es.shutdown();
        try {
            log("서비스 정상 종료 시도");
            if (!es.awaitTermination(10, TimeUnit.SECONDS)) {
                log("서비스 정상 종료 실패 -> 강제 종료 시도");
                es.shutdownNow();
                if (!es.awaitTermination(10, TimeUnit.SECONDS)) {
                    log("서비스가 종료되지 않았습니다.");
                }
            }
        } catch (InterruptedException ex) {
            es.shutdownNow();
        }
    }
}
```

**서비스 종료**   
```java
es.shutdown()   
```
- 새로운 작업을 받지 않는다. 처리 중이거나 큐에 이미 대기 중인 작업은 처리한 후에 스레드를 종료한다.
- shutdown()은 논 블로킹 메서드라서 main 스레드가 기다리지 않고 다음 코드를 바로 호출한다.
   
```java
if (!es.awaitTermination(10, TimeUnit.SECONDS)) { ... }   
```
- 블로킹 메서드라서 main 스레드가 서비스 종료를 10초간 기다린다.
- 10초 안에 모든 작업이 완료되면 true를 반환한다.
- 코드에선 longTask가 10초가 지나도 완료되지 않기 때문에 false를 반환한다.
   
**서비스 정상 종료 실패 → 강제 종료 시도**   
```java
es.shutdownNow();   
if (!es.awaitTermination(10, TimeUnit.SECONDS)) { ... }    
```
- 정상 종료가 10초 이상 걸려서 shutdownNow()를 통해 강제 종료에 들어간다.
- shutdown()과 마찬가지로 블로킹 메서드가 아니다.
- 강제 종료를 하면 작업 중인 스레드에 인터럽트가 발생하고 로그에서 확인할 수 있다.
   
**서비스 종료 실패**   
마지막 강제 종료인 es.shutdownNow()를 호출한 다음 10초를 기다린다.    
왜냐하면 shutdownNow()가 작업 중인 스레드에 인터럽트를 호출하는 것은 맞지만,    
인터럽트를 호출 하더라도 인터럽트 이후에 자원을 정리하는 작업을 수행하거나 해서 시간이 걸릴 수 있다.     
이런 시간을 기다려 주는 것이다.   

극단적이지만 while(true) { ... } 같은 코드로 인해 인터럽트를 받을 수 없을 수 있다.    
이 경우 예외가 발생하지 않고 스레드가 계속 수행 되기 때문에 자바를 강제 종료해야 제거할 수 있다.   
이런 경우를 대비해서 강제 종료 후 10초간 대기해도 작어빙 완료되지 않으면 "서비스가 종료되지 않았습니다" 라고 로그를 남긴다.     
개발자는 로그를 통해 문제를 확인하고 수정할 수 있다.   

## 13-3 Executor 스레드 풀 관리 - 코드

```java
public class ExecutorUtils {
    ...
    
    public static void printState(ExecutorService executorService, String taskName) {
        if (executorService instanceof ThreadPoolExecutor poolExecutor) {
            int pool = poolExecutor.getPoolSize();
            int active = poolExecutor.getActiveCount();
            int queued = poolExecutor.getQueue().size();
            long completedTask = poolExecutor.getCompletedTaskCount();
            log(taskName + " -> [pool=" + pool + ", active=" + active + ", queuedTasks=" + queued + ", completedTasks=" + completedTask + "]");
        } else {
            log(taskName + " -> " + executorService);
        }
    }
}

public class PoolSizeMainV1 {

    public static void main(String[] args) throws InterruptedException {
        BlockingQueue<Runnable> workQueue = new ArrayBlockingQueue<>(2);
        ExecutorService es = new ThreadPoolExecutor(2, 4, 3000, TimeUnit.MILLISECONDS, workQueue);
        printState(es);

        es.execute(new RunnableTask("task1"));
        printState(es, "task1");

        es.execute(new RunnableTask("task2"));
        printState(es, "task2");

        es.execute(new RunnableTask("task3"));
        printState(es, "task3");

        es.execute(new RunnableTask("task4"));
        printState(es, "task4");

        es.execute(new RunnableTask("task5"));
        printState(es, "task5");

        es.execute(new RunnableTask("task6"));
        printState(es, "task6");

        try {
            es.execute(new RunnableTask("task7"));
        } catch(RejectedExecutionException e) {
            log("task7 실행 거절 예외 발생: " + e);
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
   
- 작업을 보관할 블로킹 큐의 구현체로 ArrayBlockingQueue(2)를 사용했다. 최대 2개 까지 작업을 큐에 보관할 수 있다.
- corePoolSize=2, maximumPoolSize=5를 사용해서 기본 스레드는 2개, 최대 스레드는 4개로 설정했다.
  - 스레드 풀에 기본 2개의 스레드를 운영하고 요청이 많아지면 스레드 풀을 최대 4개 까지 증가시켜 사용할 수 있다.
- 3000, TimeUnit.MILLISECONDS
  - 초과 스레드가 생존할 수 있는 대기 시간을 뜻한다. 이 시간 동안 초과 스레드가 처리할 작업이 없다면 초과 스레드는 제거된다.
- 스레드 풀의 스레드가 초과 스레드 사이즈 만큼 가득 찼을 때 task7 요청이 들어오면 RejectedExecutionException 이 발생한다.
   
**Executor 스레드 풀 관리**   
1. 작업을 요청하면 core 사이즈 만큼 스레드를 만든다.
2. core 사지으를 초과하면 큐에 작업을 넣는다.
3. 큐를 초과하면 max 사이즈 만큼 스레드를 만든다. 임시로 사용되는 초과 스레드가 생성된다.
   - 작업이 큐에 가득 차면 큐에 넣을 수 없고 초과 스레드가 바로 수행한다.
4. max 사이즈를 초과하면 요청을 거절하고 예외가 발생한다.
   

**스레드 미리 생성하기**   
   
응답시간이 아주 중요한 서버라면 고객의 첫 요청을 받기 전에 스레드를 스레드 풀에 미리 생성해 두고 싶을 수 있다.   
스레드를 미리 생성해두면 처음 요청에서 사용되는 스레드의 생성 시간을 줄일 수 있다.    
ThreadPoolExecutor.prestartAllCoreThreads()를 사용하면 기본 스레드를 미리 생성할 수 있다.    
참고로 ExecutorService는 이 메서드를 제공하지 않는다.   

```java
public class PrestartPoolMain {

    public static void main(String[] args) {
        ExecutorService es = Executors.newFixedThreadPool(1000);

        printState(es);
        ThreadPoolExecutor poolExecutor = (ThreadPoolExecutor) es;
        poolExecutor.prestartAllCoreThreads();
        printState(es);
    }
}
```

## 13-4. Executor 전략 - 고정 풀 전략

**Executor 스레드 풀 관리 - 다양한 전략**   
ThreadPoolExecutor를 사용하면 스레드 풀에 사용되는 숫자와 블로킹 큐 등 다양한 속성을 조절할 수 있다.   
- corePoolSize: 스레드 풀에서 관리되는 기본 스레드의 수
- maximumPoolSize: 스레드 풀에서 관리되는 최대 스레드 수
- keepAliveTime, TimeUnit unit: 기본 스레드 수를 초과해서 만들어진 스레드가 생존할 수 있는 대기 시간, 이 시간 동안 처리할 작업이 없다면 초과 스레드는 제거된다.
- BolcingQueue workQueue: 작업을 보관할 블로킹 큐
     
자바는 Executors 클래스를 통해 3가지 기본 전략을 제공한다.   
- newSingleThreadPool(): 단일 스레드 풀 전략
- newFixedThreadPool(nThreads): 고정 스레드 풀 전략
- newCachedThreadPool(): 캐시 스레드 풀 전략
   
**newSingleThreadPool()**
- 스레드 풀에 기본 스레드 1개만 사용한다.
- 큐 사이즈에 제한이 없다.(LinkedBlockingQueue)
- 주로 간단히 사용하거나, 테스트 용도로 사용한다.

```java
new ThreadPoolExecutor(1, 1, 0L, TimeUnit.MILLISECONDS, new LinkedBlockingQueue<Runnable>())
```

### 13-4-1. Executor 스레드 풀 관리 - 고정 풀 전략

**newFixedThreadPool(nThreads)**   
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

**특징**   
스레드 수가 고정되어 있기 때문에 CPU, 메모리 리소스가 어느 정도 예측 가능한 안정적인 방식이다.    
큐 사이즈도 제하닝 없어서 작업을 많이 담아 두어도 문제가 없다.   

**주의**   
이 방식의 가장 큰 장점은 스레드 수가 고정 되어서 CPU, 메모리 리소스가 어느 정도 예측 가능하다는 점이다.   
따라서 일반적인 사오항에 가장 안정적으로 서비스를 운영할 수 있다. 하지만 아래 상황일 때 단점이 되기도 한다.   

**상황1 - 점진적인 사용자 확대**   
- 개발한 서비스가 잘 되어서 사용자가 점점 늘어난다.
- 고정 스레드 전략을 사용해서 안정적으로 잘 운영했는데, 언젠가부터 사용자들이 서비스 응답이 점점 느려진다고 항의한다.
   
**상황2 - 갑작스런 요청 증가**   
- 마케팅 팀의 이벤트가 성공 하면서 갑자기 사용자가 폭증했다.
- 고객은 응답을 받지 못한다고 항의한다.
   
**확인**   
- 개발자는 CPU, 메모리 사용량을 확인해 보지만 문제 없이 여유 있고 안정적으로 서비스가 운영되고 있다.
- 고정 스레드 전략은 실행되는 스레드 수가 고정되어 있다. 따라서 사용자가 늘어나도 CPU, 메모리 사용량이 확 늘어나지 않는다.
- 큐의 사이즈를 확인해보니 요청이 수 만 건 쌓여있다. 요청이 처리되는 시간보다 쌓이는 시간이 더 빠른 것이다. 고정 풀 전략의 큐 사이즈는 무한이다.
- 사용자가 적은 서비스 초기에는 문제가 없지만 사용자가 늘어나거나 갑작스런 요청 증가 땐 문제가 발생한다.
    
### 13-4-2. Executor 전략 - 캐시 풀 전략

**newCachedThreadPool()**   
- 기본 스레드를 사용하지 않고, 60초 생존 주기를 가진 초과 스레드만 사용한다.
- 초과 스레드의 수는 제한이 없다.
- 큐에 작업을 저장하지않는다.(SynchronousQueue)
  - 대신에 생산자의 요청을 스레드 풀의 소비자 스레드가 직접 받아서 바로 처리한다.
- 모든 요청이 대기하지 않고 스레드가 바로바로 처리해서 빠른 처리가 가능하다.
   
**SynchronousQueue**   
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

**특징**   
캐시 스레드 풀 전략은 매우 빠르고 유연한 전략이다.   
이 전략은 기본 스레드도 없고, 대기 큐에 작업이 쌓이지 않는다. 대신 작업 요청이 오면 초과 스레드로 작업을 바로바로 처리한다. 따라서 빠른 처리가 그낭하다.    
초과 스레드의 수도 제하닝 없기 때문에 CPU, 메모리 자원만 허용 한다면 시스템의 자원을 최대로 사용할 수 있다.   
초과 스레드는 60초 간 생존하기 때문에 작업 수에 맞춰 적절한 수의 스레드가 재사용된다.    
이런 특징 때문에 요청이 갑자기 증가하면 스레드도 갑자기 증가하고, 요청이 줄어들면 스레드도 점점 줄어든다.    
   

**주의**   
이 방식은 작업 수에 맞춰 스레드 수가 변하기 때문에, 작업의 처리 속도가 빠르고 CPU, 메모리를 매우 유연하게 사용할 수 있다는 장점이 있다. 하지만 상황에 따라서 큰 단점이 되기도 한다.   
   
**상황1 - 점진적인 사용자 확대**   
- 개발한 서비스가 잘 되어서 사용자가 점점 늘어난다.
- 캐시 스레드 전략을 사용하면 이런 경우 크게 문제가 되지 않는다.
- CPU, 메모리 자원은 한계가 있기 때문에 적절한 시점에 시스템을 증설해야 한다. 그렇지 않으면 시스템 자원을 너무 많이 사용해서 시스템이 다운될 수 있다.
   
**상황2 - 갑작스런 요청 증가**   
- 마케팅 팀의 이벤트가 성공 하면서 갑자기 사용자가 폭증했다.
- 고객은 응답을 받지 못한다고 항의한다.
   
**상황2 - 확인**   
- 개발자는 CPU, 메모리 사용량을 확인해보니 CPU 사용량이 100%이고, 메모리 사용량도 지나치게 높아져있다.
- 스레드 수를 확인해보니 스레드가 수 천개 실행되고 있다. 너무 많은 스레드가 작업을 처리하면서 시스템 전체가 느려지는 현상이 발생한다.
- 캐시 스레드 풀 전략은 스레드가 무한으로 생성될 수 있다.
- 수 천개의 스레드가 처리하는 속도 보다 더 많은 작업이 들어오면 시스템은 너무 많은 스레드 잠식 당해 다운되어 시스템이 멈추는 장애가 발생할 수 있다.
   
### 13-4-3. Executor 전략 - 사용자 정의 풀 전략

다음과 같이 세분화된 전략을 사용하면 사용자가 점진적으로 확대되는 현상이나 갑작스럽게 요청이 증가되는 현상을 어느정도 대응할 수 있다.   
- 일반: 일반적인 상황에는 CPU, 메모리 자원을 예층할 수 있도록 고정 크기의 스레드로 서비스를 안정적으로 운영한다.
- 긴급: 사용자의 요청이 갑자기 증가하면 긴급하게 스레드를 추가로 투입해서 작업을 빠르게 처리한다.
- 거절: 사용자의 요청이 폭증해서 긴급 대응이 어렵다면 사용자의 요청을 거절한다.
   
사용자의 요청이 갑자기 증가하면 긴급하게 스레드를 더 투입해야 한다.    
물론 긴급 상황에 CPU, 메모리 자원을 더 사용하기 때문에 사전에 부하 테스트를 통해 적정 수준을 찾아야 한다.   
시스템이 감당할 수 없을 정도로 사용자의 요청이 폭증하면, 처리 가능한 수준의 사용자 요청만 처리하고 나머지 요청은 거절해야 한다.   
어떤 경우에도 시스템이 다운되는 최악의 상황은 피해야한다.   

```java
ExecutorService es = new ThreadPoolExecutor(100, 200, 60, TimeUnit.SECONDS, new ArrayBlockingQueue<>(1000));
```

- 100개의 기본 스레드를 사용한다.
- 긴급 대응 가능한 추가 스레드 100개를 사용한다. 추가 스레드는 60초의 생존 주기를 가진다.
- 100-개의 작업이 큐에 대기할 수 있다.
   
