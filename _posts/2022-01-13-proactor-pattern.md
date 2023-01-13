---
layout: post
title: Proactor 패턴
date: 2023-01-13 15:30:00 + 0900
categories: Patterns
ref: Patterns, dispatcher, proactor, async, non-blocking
---

출처1 : https://www.javacodegeeks.com/2012/08/io-demystified.html    
출처2 : https://docs.oracle.com/javase/7/docs/api/java/nio/channels/AsynchronousChannelGroup.html    
출처3 : https://docs.oracle.com/javase/7/docs/api/java/nio/channels/AsynchronousChannel.html    
출처4 : https://docs.oracle.com/javase/7/docs/api/java/nio/channels/CompletionHandler.html       
출처5 : https://yangbox.tistory.com/28    
출처6 : https://stackoverflow.com/questions/20057497/program-does-not-terminate-immediately-when-all-executorservice-tasks-are-done     
출처7 : https://velog.io/@tkadks123/Java-NIO%EC%97%90-%EB%8C%80%ED%95%B4-%EC%95%8C%EC%95%84%EB%B3%B4%EC%9E%90-22   

# Proactor 패턴

리액터 패턴에 이어 프로액터 패턴을 알아 보겠습니다.   

## 1. Reactor 패턴

프로액터 패턴을 알아보기 전 리액터 패턴에 대해 먼저 알아 보겠습니다.

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/211336950-a7aba4b0-2ce4-4799-90b3-38be8cc94514.jpg" width="75%"/>
  <figcaption>동기 이벤트 디멀티플렉서를 활용한 리액터 패턴 구조도</figcaption>
</figure>  

이전 글에서 구현한 Reactor 패턴은 동기 이벤트 디멀티플렉서인 Selector 를 통해 Handle 을 받아오고 Handler 로 Handle 을 처리 하는 구조 입니다.    

Selector 는 IO Complete 이벤트를 기다리는 동안 블로킹 됩니다. 애플리케이션 동작 과정에서 블로킹이 발생하지만 IO 작업을 위해 블로킹 되지 않습니다.    
싱글스레드에서 IO 작업을 위해 블로킹이 발생하면, 이전 연결의 IO 작업이 완료되지 않았을 때 다음 연결을 처리할 수 없습니다.     
하지만 동기 이벤트 디멀티플렉서(Selctor)를 사용하면 IO 작업을 위해 블로킹 되지 않기 때문에 싱글스레드에서 이전 연결의 IO 작업과 상관없이 여러 연결의 IO 를 처리할 수 있습니다.   

그리고 Dispatcher 에서 Selecotr 를 호출해 Handle 을 리턴 받고 핸들러에 전달해 처리하기 때문에 동기적인 작업 흐름이라고 볼 수 있습니다.     

리액터 패턴에 대한 자세한 내용은 아래 링크를 참고해 주세요.   
  - [리액터 패턴(1)](https://5-sh.github.io/patterns/2023/01/05/reactor-pattern-1.html)
  - [리액터 패턴(2)](https://5-sh.github.io/patterns/2023/01/09/reactor-pattern-2.html)


## 2. Proactor 패턴 

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/212258018-a7e075ee-4372-4aa0-80ef-bbfb95f6f5dd.jpg" width="75%"/>
  <figcaption>프로액터 패턴 구조도</figcaption>
</figure>  

Proactor 패턴은 비동기 IO 모델로서 애플리케이션이 블로킹 되는 부분 없이 실행됩니다. 그리고 IO 작업의 결과는 호출한 곳에서 처리되지 않고 CompletionHandler 콜백을 통해 비동기적으로 실행됩니다.

### 2-1. AsynchronousChannelGroup
리소스 공유를 위한 AsynchronousChannel 의 그룹입니다.    
그룹에 연결된 AsynchronousChannel 이 실행한 비동기 IO 작업의 결과를 처리하는데 필요한 과정이 캡슐화 되어 있습니다.     

AsynchronousChannel 는 IO 이벤트를 처리하고 AsynchronousChannel 에서 수행된 비동기 작업의 결과를 CompletionHandler 로 전달하는데 사용하는 스레드 풀을 가지고 있습니다.     
스레드 풀은 비동기 IO 작업을 처리하기 위한 다른 태스크를 실행하기 위해서도 쓰일 수 있습니다.    

AsynchronousChannelGroup 은 withFixedThreadPool 또는 withCachedThreadPool 메소드를 통해 생성됩니다.    
AsynchronousChannel 은 특정 그룹을 지정해 연결되며 생성됩니다. 그룹을 명시하지 않은 채널은 디폴트 그룹에 등록되고 디플트 그룹도 스레드 풀을 가지고 있습니다.    

디플트 그룹의 스레드 풀의 스레드는 특별한 설정이 없는 한 데몬 스레드로 만들어 집니다.      
데몬 스레드는 사용자 스레드가 종료되면 작업이 끝날 때 까지 기다리지 않고 종료됩니다. 디폴트 그룹에 등록된 AsynchronousServerSocketChannel 은 연결을 accept 하기 전에 사용자 스레드가 종료되어 연결에 실패할 수 있습니다.     
따라서 while (true) ... 와 같은 반복문을 넣어 사용자 스레드가 종료되지 않도록 유지해야 합니다.

```java
public class ServerInitializer {

  private static int PORT = 6000;
  private static int threadPoolSize = 8;
  private static int initialSize = 4;
  private static int backlog = 50;
  
  ...

  public static void main(String[] args) {
    ...

    try {
      AsynchronousServerSocketChannel listener = AsynchronousServerSocketChannel.open().bind(new InetSocketAddress(port));
      AcceptCompletionHandler acceptCompletionHandler = new AcceptCompletionHandler(listener);
       listener.accept(state, acceptCompletionHandler);
    } catch (IOException e) {
      e.printStackTrace();
    }
 
    // Sleep indefinitely since otherwise the JVM would terminate
    while (true) {
      try {
        Thread.sleep(Long.MAX_VALUE);
      } catch (InterruptedException e) {
        e.printStackTrace();
      }
    }
  }
}
```

Executors.newCachedThreadPool() 를 사용해 만들어지는 스레드 풀의 스레드는 non-daemon 스레드 입니다. 따라서 Executors.newCachedThreadPool() 를 통해 만들어진 스레드 풀을 가진 AsynchronousChannelGroup 에 등록된 AsynchronousServerSocketChannel 이 연결을 accept 하기 전에 사용자 스레드가 종료되지 않습니다.    

```java
public class ServerInitializer {

  private static int PORT = 6000;
  private static int threadPoolSize = 8;
  private static int initialSize = 4;
  private static int backlog = 50;

  ...

  public static void main(String[] args) {
    ...

    ExecutorService executor = Executors.newFixedThreadPool(threadPoolSize);

    try {
      AsynchronousChannelGroup group = AsynchronousChannelGroup.withCachedThreadPool(executor, initialSize);
      AsynchronousServerSocketChannel listener = AsynchronousServerSocketChannel.open(group);
      listener.bind(new InetSocketAddress(PORT), backlog);
      listener.accept(listener, new Dispatcher(handleMap));
    } catch (IOException e) {
      e.printStackTrace();
    }
  }
}
```

AsynchronousChannelGroup 에 연결된 AsynchronousChannel 의 IO 작업 완료 핸들러는 그룹에 풀링된 스레드 중 하나를 통해 실행됩니다. IO 작업이 즉시 완료되고 실행 중인 스레드가 그룹에 풀링된 스레드 중 하나인 경우 완료 핸들러는 실행 중인 스레드에서 실행 될 수도 있습니다.    

### 2-2. AsynchronousChannel

비동기 IO 작업을 지원하는 채널입니다. 비동기 IO 작업은 두 가지 방법으로 처리됩니다.    
  - Future<V> operation(...)
  - void opertaion(... A attachment, CompletionHandler<V, ? super A> handler)

opertion 은 read, write 같은 IO 작업의 이름이고 V 는 IO 작업 결과의 유형입니다. 그리고 A 는 IO 작업에 컨텍스트를 제공하기 사용되는 개체입니다.   

Future 인터페이스에 의해 정의된 메서드는 작업이 완료 되었는지 폴링하고 작업의 결과를 확인하는데 사용됩니다.    
CompletionHandler 는 IO 작업의 결과를 콜백으로 처리하기 위해 사용됩니다.   

AsynchronousChannel 은 멀티스레드 환경에서 Thread-Safe 합니다. 

### 2-3 CompletionHandler

비동기 IO 작업의 결과를 사용하기 위한 핸들러 입니다.     
IO 작업이 성공하면 completed 메소드가 실행되고 실패하면 failed 메소드가 실행됩니다.   

### 2-4. 코드

Java NIO 2 API 를 사용해 만든 에코 서버 입니다.

```java
public class ProactorInitiator {
  static int ASYNC_SERVER_PORT = 4333;
 
  public void initiateProactiveServer(int port)
    throws IOException {
 
    final AsynchronousServerSocketChannel listener = AsynchronousServerSocketChannel.open().bind(new InetSocketAddress(port));
     AcceptCompletionHandler acceptCompletionHandler = new AcceptCompletionHandler(listener);
     SessionState state = new SessionState();
     listener.accept(state, acceptCompletionHandler);
  }
 
  public static void main(String[] args) {
    try {
       System.out.println('Async server listening on port : ' + ASYNC_SERVER_PORT);
       new ProactorInitiator().initiateProactiveServer(ASYNC_SERVER_PORT);
    } catch (IOException e) {
      e.printStackTrace();
    }
 
    // Sleep indefinitely since otherwise the JVM would terminate
    while (true) {
      try {
        Thread.sleep(Long.MAX_VALUE);
      } catch (InterruptedException e) {
        e.printStackTrace();
      }
    }
  }
}
 
public class AcceptCompletionHandler implements CompletionHandler<AsynchronousSocketChannel, SessionState> {

  private AsynchronousServerSocketChannel listener;
 
  public AcceptCompletionHandler(AsynchronousServerSocketChannel listener) {
    this.listener = listener;
  }
 
  @Override
  public void completed(AsynchronousSocketChannel socketChannel, SessionState sessionState) {
    // accept the next connection
    SessionState newSessionState = new SessionState();
    listener.accept(newSessionState, this);
 
    // handle this connection
    ByteBuffer inputBuffer = ByteBuffer.allocate(2048);
    ReadCompletionHandler readCompletionHandler = new ReadCompletionHandler(socketChannel, inputBuffer);
    socketChannel.read(inputBuffer, sessionState, readCompletionHandler);
  }
 
  @Override
  public void failed(Throwable exc, SessionState sessionState) {
   // Handle connection failure...
  }
}
 
public class ReadCompletionHandler implements CompletionHandler<Integer, SessionState> {
 
  private AsynchronousSocketChannel socketChannel;
  private ByteBuffer inputBuffer;

  public ReadCompletionHandler(AsynchronousSocketChannel socketChannel, ByteBuffer inputBuffer) {
   this.socketChannel = socketChannel;
   this.inputBuffer = inputBuffer;
  }
 
  @Override
  public void completed(Integer bytesRead, SessionState sessionState) {
    byte[] buffer = new byte[bytesRead];
    inputBuffer.rewind();
    // Rewind the input buffer to read from the beginning
 
    inputBuffer.get(buffer);
    String message = new String(buffer);
 
    System.out.println('Received message from client : ' + message);
 
    // Echo the message back to client
    WriteCompletionHandler writeCompletionHandler = new WriteCompletionHandler(socketChannel);
 
    ByteBuffer outputBuffer = ByteBuffer.wrap(buffer);
 
    socketChannel.write(outputBuffer, sessionState, writeCompletionHandler);
  }
 
  @Override
  public void failed(Throwable exc, SessionState attachment) {
    //Handle read failure.....
  }
}
 
public class WriteCompletionHandler implements CompletionHandler<Integer, SessionState> {
 
  private AsynchronousSocketChannel socketChannel;
 
  public WriteCompletionHandler(AsynchronousSocketChannel socketChannel) {
    this.socketChannel = socketChannel;
  }
 
  @Override
  public void completed(Integer bytesWritten, SessionState attachment) {
    try {
      socketChannel.close();
    } catch (IOException e) {
      e.printStackTrace();
    }
  }
 
  @Override
  public void failed(Throwable exc, SessionState attachment) {
   // Handle write failure.....
  }
}
 
public class SessionState {
 
  private Map<String, String> sessionProps = new ConcurrentHashMap<String, String>();
 
  public String getProperty(String key) {
    return sessionProps.get(key);
  }
 
  public void setProperty(String key, String value) {
    sessionProps.put(key, value);
  }
 
}
```
