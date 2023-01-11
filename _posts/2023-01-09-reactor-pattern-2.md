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

## 1. Blocking / Sync

## 2. Non blocking / Sync

## 3. Non blocking / Async - ready event

### 3-1. Linux - select() system call

## 4. Non blocking / Async - complete event

### 4-1. Linux - epoll() system call

### 4-2. Java nio

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/211336950-a7aba4b0-2ce4-4799-90b3-38be8cc94514.jpg" width="75%"/>
  <figcaption>리액터 패턴 구조도</figcaption>
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
