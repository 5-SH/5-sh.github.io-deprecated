---
layout: post
title: HTTP 서버 프로그램 - 애노테이션 (2)
date: 2024-11-06 19:00:00 + 0900
categories: [java]
tags: [network, socket, http, annotation]
---

### 강의 : [김영한의 실전 자바 - 고급 2편, I/O, 네트워크, 리플렉션](https://www.inflearn.com/course/%EA%B9%80%EC%98%81%ED%95%9C%EC%9D%98-%EC%8B%A4%EC%A0%84-%EC%9E%90%EB%B0%94-%EA%B3%A0%EA%B8%89-2/dashboard)

# 11. HTTP 서버 프로그램 - 애노테이션

리플렉션을 활용한 서버 프로그램은 요청 URL과 메서드 이름이 같을 때만 동작한다.   
따라서 / 요청을 처리하기 위한 작업은 컨트롤러에 둘 수 없고 별도의 서블릿으로 구현해야 했다.   
그리고 /site1이 와도 page1()과 같은 메서드를 호출 하듯이 요청 URL과 메서드 이름을 다르게 할 수 없었다.
이 문제를 해결하려면 애노테이션을 사용해야 한다.   
<br/>
그리고 site1(), site2() 같은 함수는 HttpRequest 파라메터를 필요로 하지 않는다.   
리플렉션으로 메서드를 호출 할 때 동적으로 바인딩 하도록 리플렉션으로 함수를 호출하는 부분을 개선한다.   
<br/>
마지막으로 요청을 처리할 메서드를 찾기 위해 컨트롤러에 선언한 모든 메서드를 반복문으로 찾아야 하고    
같은 요청을 처리하는 메서드가 중복되는 경우가 발생할 수 있다.   
이 문제를 해결하기 위해 컨트롤러 메서드를 List로 관리하던 부분은 Map으로 관리하도록 수정한다.   

## 11-1. Conroller

URL 정보로 호출할 메소드를 찾기 위해 Mapping 이라는 애노테이션을 정의한다.
컨트롤러의 메서드들에 Mapping 애노테이션을 추가한다. / URL은 Mapping(value = "/") 애노테이션을 통해 home() 메서드를 호출할 수 있다.   

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
@Documented
public @interface Mapping {
    String value();
}
```

```java
public class SiteController {

    @Mapping(value = "/")
    public void home(HttpResponse response) {
        response.writeBody("<h1>home</h1>");
        response.writeBody("<ul>");
        response.writeBody("<li><a href='/site1'>site1</a></li>");
        response.writeBody("<li><a href='/site2'>site2</a></li>");
        response.writeBody("<li><a href='/search?q=hello'>검색</a></li>");
        response.writeBody("</ul>");
    }

    @Mapping(value="/site1")
    public void site1(HttpResponse response) {
        response.writeBody("<h1>site1</h1>");
    }

    @Mapping(value="/site2")
    public void site2(HttpResponse response) {
        response.writeBody("<h1>site2</h1>");
    }
}

public class SearchController {

    @Mapping(value = "/search")
    public void search(HttpRequest request, HttpResponse response) {
        String query = request.getQueryParameter("q");

        response.writeBody("<h1>Search</h1>");
        response.writeBody("<ul>");
        response.writeBody("<li>query: " + query + "</li>");
        response.writeBody("</ul>");
    }
}
```

## 11-2. AnnotationServlet

AnnotationServlet가 초기화 할 때 컨트롤러들을 받고 pathMap에 Mapping 애노테이션의 value를 키 값으로 해서 메서드를 저장한다.   
메서드를 호출 할 때 동적 바인딩으로 호출 할 수 있도록 ControllerMethod 클래스를 만들고 리플렉션으로 메서드를 호출할 때 메서드의 파라메터 정보를 확인해 호출하도록 만든다.    
service() 메서드에서는 HttpRequest에서 URL path를 구하고 pathMap에서 호출할 ControllerMethod를 찾아 요청을 처리할 메서드를 호출한다.

```java
public class AnnotationServlet implements HttpServer {

    private final Map<String, ControllerMethod> pathMap;

    public AnnotationServlet(List<Object> controllers) {
        this.pathMap = new HashMap<>();
        initializePathMap(controllers);
    }

    private void initializePathMap(List<Object> controllers) {
        for (Object controller : controllers) {
            Method[] methods = controller.getDeclaredMethods();
            for (Method method : methods) {
                if (method.isAnnotationPresent(Mapping.class)) {
                    String path = method.getAnnotation(Mapping.class).value();

                    if (pathMap.containsKey(path)) {
                        ControllerMethod controllerMethod = pathMap.get(path);
                        throw new IllegalArgumentException("경로 중복 등록, path=" + path + ", method=" + method + ", 이미 등록된 메서드=" + controllerMethod.method);
                    }

                    pathMap.put(path, new ControllerMethod(controller, method));
                }
            }
        }
    }

    @Override
    public void service(HttpRequest request, HttpResponse response) throws IOException {
        String path = request.getPath();
        ControllerMethod controllerMethod = pathMap.get(path);
        if (controllerMethod == null) throw new PageNotFoundException("request=" + path);

        controllerMethod.invoke(request, response);
    }

    private class ControllerMethod {

        private final Object controller;
        private final Method method;

        public ControllerMethod(Object controller, Method method) {
            this.controller = controller;
            this.method = method;
        }

        public void invoke(HttpRequest request, HttpResponse response) {
            Class<?>[] parameterTypes = method.getParameterTypes();
            Object[] args = new Object[parameterTypes.length];

            for (int i = 0; i < parameterTypes.length; i++) {
                if (parameterTypes[i] == HttpRequest.class) args[i] = request;
                else if (parameterTypes[i] == HttpResponse.class) args[i] = response;
                else throw new IllegalArgumentException("Unsupported parameter type: " + parameterTypes[i]);
            }

            try {
                method.invoke(controller, args);
            } catch (IllegalAccessException | InvocationTargetException e) {
                throw new RuntimeException(e);
            }
        }
    }
}
```

## 11-3. Server

Servlet과 관련된 부분만 수정하고 HttpServer에 대한 부분은 수정하지 않았다.

```java
public class ServerMainV8 {

    private static final int PORT = 12345;

    public static void main(String[] args) throws IOException {
        List<Object> controllers = List.of(new SiteController(), new SearchController());
        ServletManager servletManager = new ServletManager();
        servletManager.setDefaultServlet(new AnnotationServlet(controllers));
        servletManager.add("/favicon.ico", new DiscardServlet());
        HttpServer server = new HttpServer(PORT, servletManager);
        server.start();
    }
}
```