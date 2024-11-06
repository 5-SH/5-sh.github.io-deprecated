---
layout: post
title: HTTP 서버 프로그램 - 커맨드 패턴
date: 2024-11-06 11:00:00 + 0900
categories: Java
ref: network, socket, http, command pattern
---

### 강의 : [김영한의 실전 자바 - 고급 2편, I/O, 네트워크, 리플렉션](https://www.inflearn.com/course/%EA%B9%80%EC%98%81%ED%95%9C%EC%9D%98-%EC%8B%A4%EC%A0%84-%EC%9E%90%EB%B0%94-%EA%B3%A0%EA%B8%89-2/dashboard)

# 8. HTTP 서버 프로그램 - 커맨드 패턴

아래와 같이 /, /site1, /site2, /search 경로로 이동 가능한 간단한 웹페이지 서버를 만든다.   
서버는 여러 클라이언트(브라우저)의 요청을 처리할 수 있어야 한다.   
그리고 경로 별 기능은 커맨더 패턴을 활용해 수정, 추가가 편리하도록 개발한다.    

## 8-1. HttpRequest

클라이언트의 Http 요청을 받아 시작라인과 헤더를 파싱해 저장한다.   
시작 라인은 method, path, query parameter를 가진다.   

```java
public class HttpRequest {
    
    private final String method;
    private final String path;
    private final Map<String, String> queryParameters = new HashMap<>();
    private final Map<String, String> headers = new HashMap<>();

    public HttpRequest(BufferedReader reader) throws IOException {
        parseRequestLine(reader);
        parseHeaders(reader);
        // 메시지 바디는 이후에 처리
    }

    private void parseRequestLine(BufferedReader reader) throws IOException {
        String requestLine = reader.readLine();
        if (requestLine == null) throw new IOException("EOF: No request line received");

        String[] parts = requestLine.split(" ");
        if (parts.length != 3) throw new IOException("Invalid request line: " + requestLine);

        method = parts[0];
        String[] pathParts = parts[1].split("\\?");
        path = pathParts[0];

        if (pathParts.length > 1) parseQueryParameters(pathParts[1]);
    }

    private void parseQueryParameters(String queryString) {
        for (String param : queryString.split("&")) {
            String[] keyValue = param.split("=");
            String key = URLDecoder.decode(keyValue[0], StandardCharsets.UTF_8);
            String value = keyValue.length > 1 ? URLDecoder.decode(keyValue[1], StandardCharsets.UTF_8) : "";
            queryParameters.put(key, value);
        }
    }

    private void parseHeaders(BufferedReader reader) {
        String line;
        while (!(line = reader.readLine()).isEmpty()) {
            String[] headerParts = line.split(":");
            headers.put(headerParts[0].trim(), headerParts[1].trim());
        }
    }

    public String getMethod() {
        return method;
    }

    public String getPath() {
        return path;
    }

    public String getParameter(String name) {
        return queryParameters.get(name);
    }

    public String getHeader(String name) {
        return headers.get(name);
    }

    @Override
    public String toString() {
        return "HttpRequest{" +
                "method='" + method + '\'' +
                ", path='" + path + '\'' +
                ", queryParameters=" + queryParameters +
                ", headers=" + headers +
                '}';
    }
}
```

## 8-2. HttpResponse

클라이언트에 응답할 Http 메시지를 만들어 보낸다.   
Status code, Status message, 응답 헤더를 설정하고 메시지 바디를 작성해 클라이언트에게 전송한다.   

```java
public class HttpResponse {
    
    private final PrintWriter writer;
    private int statusCode = 200;
    private final StringBuilder builder = new StringBuilder();
    private String contentType = "text/html; charset=UTF-8";

    public HttpResponse(PrintWriter writer) {
        this.writer = writer;
    }

    public void setStatusCode(int statusCode) {
        this.statusCode = statusCode;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public void writeBody(String body) {
        bodyBuilder.append(body);
    }

    public void flush() {
        int contentLength = bodyBuilder.toString().getBytes(StandardCharsets.UTF_8).length;
        writer.println("HTTP/1.1 " + statusCode + " " + getReasonPhrase(statusCode));
        writer.println("Content-Type: " + contentType);
        writer.println("Content-Length: " + contentLength);
        writer.println();
        writer.println(bodyBuilder);
        writer.flush();
    }

    private String getReasonPhrase(int statusCode) {
        switch (statusCode) {
            case 200:
                return "OK";
            case 404:
                return "Not Found";
            case 500:
                return "Internal Server Error";
            default:
                return "Unknown Status";
        }
    }
}
```

## 8-3. Servlet

/, /site1, /site2, /search 경로 별 기능을 각 Servlet에 구현한다. Servlet은 앞선 채팅 프로그램의 Command와 동일한 역할을 한다.   
그리고 요청에 맞는 적절한 Servlet을 찾고 관리하는 ServletManager를 구현한다. ServletManager는 앞선 채팅 프로그램의 CommandManager와 동일한 역할을 한다.   

```java
public interface HttpServlet {
    public void service(HttpRequest request, HttpResponse response) throws IOException;
}

public class HomeServlet implements HttpServlet {
    @Override
    public void service(HttpRequest request, HttpResponse response) throws IOException {
        response.writeBody("<h1>home</h1>");
        response.writeBody("<ul>");
        response.writeBody("<li><a href='/site1'>site1</a></li>");
        response.writeBody("<li><a href='/site2'>site2</a></li>");
        response.writeBody("<li><a href='/search?q=hello'>검색</a></li>");
        response.writeBody("</ul>");
    }
}

public class Site1Servlet implements HttpServlet {
    @Override
    public void service(HttpRequest request, HttpResponse response) throws IOException {
        response.writeBody("<h1>site1</h1>");
    }
}

public class Site2Servlet implements HttpServlet {
    @Override
    public void service(HttpRequest request, HttpResponse response) throws IOException {
        response.writeBody("<h1>site2</h1>");
    }
}

public class SearchServlet implements HttpServlet {
    @Override
    public void service(HttpRequest request, HttpResponse response) throws IOException {
        String query = request.getParameter("q");

        response.writeBody("<h1>Search</h1>");
        response.writeBody("<ul>");
        response.writeBody("<li>query: " + query + "</li>");
        response.writeBody("</ul>");
    }
}

public class DiscardServlet implements HttpServlet {
    @Override
    public void service(HttpRequest request, HttpResponse response) throws IOException {

    }
}

public class InternalErrorServlet implements HttpServlet {
    @Override
    public void service(HttpRequest request, HttpResponse response) throws IOException {
        response.setStatusCode(500);
        response.writeBody("<h1>Internal Error</h1>");
    }
}

public class NotFoundErrorServlet implements HttpServlet {
    @Override
    public void service(HttpRequest request, HttpResponse response) throws IOException {
        response.setStatusCode(404);
        response.writeBody("<h1>404 페이지를 찾을 수 없습니다.</h1>");
    }
}
```

```java
public class ServletManager {

    private final HashMap<String, HttpServlet> servletMap = new HashMap<>();
    private HttpServlet defaultServlet;
    private HttpServlet notFoundErrorServlet = new NotFoundErrorServlet();
    private HttpServlet internalErrorServlet = new InteralErrorServlet();

    public ServletManager() {}

    public void add(String path, HttpServlet servlet) {
        servletMap.put(path, servlet);
    }

    public void setDefaultServlet(HttpServlet defaultServlet) {
        this.defaultServlet = defaultServlet;
    }

    public void setNotFoundErrorServlet(HttpServlet notFoundErrorServlet) {
        this.notFoundErrorServlet = notFoundErrorServlet;
    }

    public void setInternalErrorServlet(HttpServlet internalErrorServlet) {
        this.internalErrorServlet = internalErrorServlet;
    }

    public void execute(HttpRequest request, HttpResponse response) throws IOException {
        try {
            HttpServlet servlet = servletMap.getOrDefault(request.getPath(), defaultServlet);
            if (servlet == null) throw new PageNotFoundException("request url= " + reuest.getPath());
            servlet.service(request, response);
        } catch (PageNotFoundException e) {
            e.printStackTrace();
            notFoundErrorServlet.service(request, response);
        } catch (Exception e) {
            e.printStackTrace();
            internalErrorServlet.service(request response);
        }
    }
}
```

## 8-4. HttpServer

HttpServer는 여러 클라이언트의 요청을 동시에 처리할 수 있도록 요청을 처리하는 작업을 HttpRequestHander에 구현한다.    
HttpRequestHandler는 ExecutorService 에서 실행될 수 있도록 Runnable 인터페이스를 구현한다.    
ExecutorService는 10개의 스레드 풀을 가지고 요청이 들어오면 HttpRequestHandler가 동작하고  
ServletManager에서 요청을 처리할 HttpServlet을 찾아 실행한다. 

```java
public class HttpRequestHandler implements Runnable {

    private final Socket socket;
    private final ServletManager servletManager;

    public HttpRequestHandler(Socket socket, ServletManager servletManager) {
        this.socket = socket;
        this.servletManager = servletManager;
    }

    @Override
    public void run() {
        try {
            process(socket);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    private void process(Socket socket) throws IOException {
        try (socket;
             BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), UTF_8));
             PrintWriter writer = new PrintWriter(socket.getOutputStream(), false, UTF_8)) {

            HttpRequest request = new HttpRequest(reader);
            HttpResponse response = new HttpResponse(writer);

            log("HTTP 요청: " + request);
            servletManager.execute(request, response);
            response.flush();
            log("HTTP 응답 완료");
        }
    }
}

public class HttpServer {

    private final ExecutorService es = Executors.newFixedThreadPool(10);
    private final int port;
    private final ServletManager servletManager;

    public HttpServer(int port, ServletManager servletManager) {
        this.port = port;
        this.servletManager = servletManager;
    }

    public void start() throws IOException {
        ServerSocket serverSocket = new ServerSocket(port);
        while (true) {
            Socket socket = serverSocket.accept();
            es.submit(new HttpRequestHandler(socket, servletManager));
        }
    }
}
```

```java
public class ServerMainV5 {

    private static final int PORT = 12345;

    public static void main(String[] args) throws IOException {
        ServletManager servletManager = new ServletManager();
        servletManager.add("/", new HomeServlet());
        servletManager.add("/site1", new Site1Servlet());
        servletManager.add("/site2", new Site2Servlet());
        servletManager.add("/search", new SearchServlet());
        servletManager.add("/favicon.ico", new DiscardServlet());

        HttpServer server = new HttpServer(PORT, servletManager);
        server.start();
    }
}
```

## 8-5. 웹 애플리케이션 서버의 역사

위에 작성한 HttpServer를 활용하면 복잡한 네트워크, 멀티스레드, HTTP 메시지 파싱에 대한 부분을 해결해줘,    
HttpServlet의 구현체만 만들면 쉽게 HTTP 서비스를 개발할 수 있다.    
<br/>
웹 애플리케이션 서버(WAS)는 웹(HTTP)를 기반으로 작동하는 서버인데, 이 서버를 통해서 프로그램의 코드도 실행할 수 있는 서버를 말한다.   
프로그램 코드는 서블릿 구현체들이다.    
<br/>
HTTP와 웹이 처음 등장하면서 많은 회사에서 직접 HTTP 서버와 비슷한 기능을 개발했다.     
그런데 문제는 각 회사에서 만든 서버 간에 호환성이 없어 서버를 변경하려면 코드를 많이 수정해야 했다.
<br/>
이런 문제를 해결하기 위해 1990년대 자바 진영에서 Servlet이라는 표준이 등장한다.   
Servlet은 Servlet, HttpServlet, ServletRequest, ServletResponse 등 많은 표준을 제공한다.    
HTTP 서버를 만드는 회사들은 모두 서블릿을 기반으로 기능을 제공한다.     
처음에는 javax.servlet 패키지를 사용했는데, 이후에 jakarta.servlet으로 변경된다.   
Apache Tomcat, Jetty Oracle WebLogic 등이 서블릿을 제공하는 WAS 이다.   
<br/>
HTTP 서버를 만드는 회사들이 서블릿을 기반으로 기능을 제공하기 때문에 개발자는 jakarta.servlet.Servlet 인터페이스를 구현하면 된다.    
그리고 Apache Tomcat 같은 애플리케이션 서버에서 작성한 Servlet 구현체를 실행할 수 있다.   
만약 HTTP 서버를 다른 종류로 변경해도 기능 변경 없이 서블릿들을 그대로 사용할 수 있다.   
<br/>
표준화된 서블릿 스펙 덕분에 애플리케이션 서버를 제공하는 회사들은 각자의 경쟁력을 키우기 위해 성능 최적화나 부가 기능, 관리 도구 등의 차별화 요소에 집중할 수 있고   
개발자들을 서버에 종속되지 않는 코드를 작성할 수 있는 자유를 얻게 되었다.   
이런 표준화 덕분에 자바 웹 애플리케이션 생태계는 크게 발전할 수 있었다.   