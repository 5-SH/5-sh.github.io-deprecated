---
layout: post
title: Reactor 패턴 (2)
date: 2023-01-09 22:30:00 + 0900
categories: Patterns
ref: Patterns, dispatcher, reactor
---

출처1 : https://www.javacodegeeks.com/2012/08/io-demystified.html    
출처2 : https://reakwon.tistory.com/117   
출처3 : https://rammuking.tistory.com/entry/Epoll%EC%9D%98-%EA%B8%B0%EC%B4%88-%EA%B0%9C%EB%85%90-%EB%B0%8F-%EC%82%AC%EC%9A%A9-%EB%B0%A9%EB%B2%95   

# Reactor 패턴 (2)

리액터 패턴을 알아보기 전에 동기/비동기, 블로킹/논블로킹 서버의 구조를 먼저 알아 보겠습니다.     
리액터 패턴은 기존 동기/블로킹 구조의 비효율적인 부분을 보완한 비동기/논블로킹 구조에 적합한 패턴입니다.

## 1. Blocking / Sync

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/212038614-c5583a65-3f06-47aa-901f-9f338b098ee7.png" width="75%"/>
  <p style="font-style: italic; color: gray;">Blocking / Sync</p>
</figure>  

연결을 처리하는 각각의 스레드가 오랫동안 블로킹 되면 스레드 풀에 사용 가능한 스레드가 없어 연결을 처리하지 못합니다.    
그렇다고 연결마다 스레드를 만들어 처리하면 리소스가 낭비되고 잦은 컨텍스트 스위칭으로 오히려 성능이 나빠질 수 있습니다.

## 2. Non blocking / Sync

애플리케이션에서 데이터가 준비 되었는지 커널에 매번 폴링합니다.     
애플리케이션의 실행이 블로킹 되지 않아 IO 를 기다리는 동안 다른 작업을 할 수 있지만 IO 가 준비 되었는지 매번 확인해야 하기 때문에 비효율적 입니다.

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/212041158-eb95f652-973e-442e-8529-b7fedde318c9.png" width="75%"/>
  <p style="font-style: italic; color: gray;">Non blocking / Sync</p>
</figure>  

## 3. Non blocking / Async - ready event

커널에 데이터가 준비 되었는지 매번 물어보는 것 보다 읽기/쓰기 준비가 완료 되었을 때 커널이 유저 프로그램에 알리는 것이 더 효율적 입니다.    
리눅스의 select(), poll(), epoll() 같은 시스템 콜을 사용하면 커널이 데이터가 준비 되었을 때 ready 이벤트로 알려줍니다.     

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/212043951-53fe80b5-b985-4ea3-9990-48b5a49c3584.png" width="75%"/>
  <p style="font-style: italic; color: gray;">Non blocking / Async</p>
</figure>  

이 시스템 콜은 블로킹 되어 있다가 읽기/쓰기 준비가 된 파일이 생기면 그 파일의 디스크립터를 반환합니다.      
동기 이벤트 디멀티플렉서라고 볼 수 있습니다.([Node.js 의 리액터 패턴](https://5-sh.github.io/patterns/2021/08/01/reactor-pattern.html))

### 3-1. Linux - select() system call

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/212045289-2d0912bf-7c11-478a-817f-f94ecdebab9d.png" width="75%"/>
  <p style="font-style: italic; color: gray;">Non blocking / Async</p>
</figure>  

애플리케이션에서 ready 이벤트를 받으면 파일을 메모리에서 애플리케이션의 버퍼까지 가져오는 작업을 수행해야 합니다.    
이 방식 보다는 애플리케이션의 버퍼까지 파일 데이터를 가져온 다음 이벤트를 받는 것이 더 효율적 입니다.    
이런 방식의 IO 를 AIO 라고 하고 리눅스는 poll(), epoll() 시스템 콜을 통해 지원합니다.

## 4. Non blocking / Async - complete event

리눅스는 AIO posix api / 윈도우는 windows I/O completion port 로 지원합니다.     
그리고 자바는 NIO2 Asynchronous Channel API 로 플랫폼 별 AIO 를 추상화 했습니다.

### 4-1. Linux - epoll() system call

epoll 시스템 콜을 활용한 비동기/논블로킹에 리액터 패턴을 적용한 구조는 아래와 같습니다.    

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/212048112-a2d1bb86-b6f9-4abf-975e-f9c2dddd7a11.png" width="75%"/>
  <p style="font-style: italic; color: gray;">epoll</p>
</figure>  

### 4-2. Java NIO 를 활용한 리액터 패턴

Java NIO 를 사용해 비동기/논블로킹에 리액터 패턴을 적용한 구조는 아래와 같습니다.    
NIO 는 소켓, 파일과 같은 IO 대상을 __Channel__ 로 추상화 했고 리눅스의 select(), epoll(), poll() 과 같은 이벤트 디멀티플렉서를 __Selctor__ 로 추상화 했습니다.    
그리고 애플리케이션 버퍼로 가져온 IO 데이터는 __Handle__ 로 추상화 했습니다.     
각 handle 은 handler 를 통해 처리됩니다.

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/211336950-a7aba4b0-2ce4-4799-90b3-38be8cc94514.jpg" width="75%"/>
  <p style="font-style: italic; color: gray;">동기 이벤트 디멀티플렉서를 활용한 리액터 패턴 구조도</p>
</figure>  

### 4-3. 코드

전체 코드 링크 는 [이 링크](https://github.com/5-SH/sw_architecture_tactics_and_applications/tree/master/projects/ReactiveServer) 를 참고해 주세요.   

```java 
public class ReactorInitiator {
  private static final int NIO_SERVER_PORT = 9993;

  public void initiateReactiveServer(int port) throws Exception {
    ServerSocketChannel server = ServerSocketChannel.open();
    server.socket().bind(new InetSocketAddress(port));
    server.configureBlocking(false);

    Dispatcher dispatcher = new Dispatcher();
    dispatcher.registerChannel(SelectionKey.OP_ACCEPT, server);

    dispatcher.registerEventHandler(SelectionKey.OP_ACCEPT, new AcceptEventHandler(dispatcher.getDemultiplexer()));
    dispatcher.registerEventHandler(SelectionKey.OP_READ, new ReadEventHandler(dispatcher.getDemultiplexer()));
    dispatcher.registerEventHandler(SelectionKey.OP_WRITE, new WriteEventHandler(dispatcher.getDemultiplexer()));

    dispatcher.run();
  }

  public static void main(String[] args) throws Exception {
    System.out.println("Starting NIO server at port : " + NIO_SERVER_PORT);
    new ReactorInitiator().initiateReactiveServer(NIO_SERVER_PORT);
  }
}

public class Dispatcher {

  private Map<Integer, EventHandler> registeredHandlers = new ConcurrentHashMap<Integer, EventHandler>();
  private Selector demultiplexer;

  public Dispatcher() throws Exception {
    this.demultiplexer = Selector.open();
  }

  public Selector getDemultiplexer() {
    return demultiplexer;
  }

  public void registerChannel(int eventType, SelectableChannel channel) throws Exception {
    channel.register(demultiplexer, eventType);
  }

  public void registerEventHandler(int eventType, EventHandler handler) {
    registeredHandlers.put(eventType, handler);
  }

  public void run() {
    try {
      while (true) {
        demultiplexer.select();

        Set<SelectionKey> readyHandles = demultiplexer.selectedKeys();
        Iterator<SelectionKey> handleIterator = readyHandles.iterator();

        while (handleIterator.hasNext()) {
          SelectionKey handle = handleIterator.next();

          if (handle.isAcceptable()) {
            EventHandler handler = registeredHandlers.get(SelectionKey.OP_ACCEPT);
            handler.handleEvent(handle);
          }

          if (handle.isReadable()) {
            EventHandler handler = registeredHandlers.get(SelectionKey.OP_READ);
            handler.handleEvent(handle);
          }

          if (handle.isWritable()) {
            EventHandler handler = registeredHandlers.get(SelectionKey.OP_WRITE);
            handler.handleEvent(handle);
          }
        }
      }
    } catch (Exception e) {
      e.printStackTrace();
    }
  }
}

public interface EventHandler {
  public void handleEvent(SelectionKey handle) throws Exception;
}

public class AcceptEventHandler implements EventHandler {

  private Selector demultiplexer;

  public AcceptEventHandler(Selector demultiplexer) {
    this.demultiplexer = demultiplexer;
  }

  @Override
  public void handleEvent(SelectionKey handle) throws Exception {
    ServerSocketChannel serverSocketChannel = (ServerSocketChannel) handle.channel();
    SocketChannel socketChannel = serverSocketChannel.accept();

    if (socketChannel != null) {
      socketChannel.configureBlocking(false);
      socketChannel.register(demultiplexer, SelectionKey.OP_READ);
    }
  }
}
```
