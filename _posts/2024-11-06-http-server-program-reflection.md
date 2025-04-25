---
layout: post
title: HTTP 서버 프로그램 - 리플렉션
date: 2024-11-06 13:00:00 + 0900
categories: [java]
tags: [network, socket, http, reflection]
---

### 강의 : [김영한의 실전 자바 - 고급 2편, I/O, 네트워크, 리플렉션](https://www.inflearn.com/course/%EA%B9%80%EC%98%81%ED%95%9C%EC%9D%98-%EC%8B%A4%EC%A0%84-%EC%9E%90%EB%B0%94-%EA%B3%A0%EA%B8%89-2/dashboard)

# 9. HTTP 서버 프로그램 - 리플렉션

앞서 커맨드 패턴으로 만든 서블릿은 두 가지 단점이 있다.   
- 하나의 클래스에 하나의 기능만 만들 수 있다.
- 새로 만든 클래스를 URL 경로와 항상 매핑해야 한다.
<br/>
비슷한 기능을 하는 서블릿들을 하나의 컨트롤러 클래스에 모은다. 그리고 요청 URL와 같은 이름으로 컨트롤러에 메서드를 구현한다.    
리플렉션을 활용해 사용자의 요청을 받으면 요청한 URL에 맞는 컨트롤러의 메서드를 호출하도록 만든다.   
<br/>
HttpServer에 대한 부분은 수정할 필요 없이 Servlet과 관련된 부분만 구현하면 된다.   

## 9-1. Controller

/site1, /site2/ 요청은 SiteController에서 처리하고 /search 요청은 SearchController에서 처리한다.   
/ 요청은 메서드 이름이 없어 처리할 메서드를 만들 수 없기 때문에 기존 HomeServlet으로 처리한다.   

```java
public class SiteController {
    
    public void site1(HttpRequest request, HttpResponse response) {
        response.writeBody("<h1>site1</h1>");
    }

    public void site2(HttpRequest request, HttpResponse response) {
        response.writeBody("<h1>site2</h1>");
    }
}

public class SearchController {

    public void search(HttpRequest request, HttpResponse response) {
        String query = request.getParameter("q");

        response.writeBody("<h1>Search</h1>");
        response.writeBody("<ul>");
        response.writeBody("<li>query: " + query + "</li>");
        response.writeBody("</ul>");
    }
}
```

## 9-2. ReflectionServlet

클라이언트의 URL 요청으로 컨트롤러에 있는 메서드 중 필요한 메서드를 호출하는 서블릿을 만든다.   
리플렉션으로 컨트롤러에 있는 메서드들 중 요청 URL과 동일한 이름을 가진 메소드를 찾아 실행한다.   

```java
public class ReflectionServlet implements HttpServlet {
    
    private final List<Object> controllers;
    
    public ReflectionServlet(List<Object> controllers) {
          this.controllers = controllers;
    }

    @Override
    public void service(HttpRequest request, HttpResponse response) throws IOException {
        String path = request.getPath();

        for (Object controller : controllers) {
            Class<?> aClass = controller.getClass();
            Method[] methods = aClass.getDeclaredMethods();
            for (Method method : methods) {
                String methodName = method.getName();
                if (path.equals("/" + methodName)) {
                    invoke(controller, method, request, response);
                    return;
                }
            }
        }
        throw new PageNotFoundException("request=" + path);
    }

    private static void invoke(Object controller, Method method, HttpRequest request, HttpResponse response) {
        try {
            method.invoke(controller, request, response);
        } catch (InvocationTargetException | IllegalAccessException e) {
            throw new RuntimeException(e);
        }
    }
}
```

## 9-3. ServerMain

```java
public class ServerMain {

    private static final int PORT = 12345;

    public static void main(String[] args) throws IOException {
        List<Object> controllers = List.of(new SiteController(), new SearchController());
        HttpServlet reflectionServlet = new ReflectionServlet(controllers);

        ServletManager servletManager = new ServletManager();
        servletManager.setDefaultServlet(reflectionServlet);
        servletManager.add("/", new HomeServlet());
        servletManager.add("/favicon.ico", new DiscardServlet());

        HttpServer server = new HttpServer(PORT, serveltManager);
        server.start();
    }
}
```