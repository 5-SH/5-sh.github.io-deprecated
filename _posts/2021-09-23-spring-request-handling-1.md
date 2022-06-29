---
layout: post
title: spring request handling 1
date: 2021-09-23 23:00:00 + 0900
categories: Spring
ref: Spring, Servlet
---

# 스프링 요청 처리 과정 1

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/134381785-9ba80f37-4068-4afd-8660-a3fda3376ea6.png" height="450" />
  <figcaption></figcaption>
</figure>

1. request 가 Servlet 을 통해 Dispatcher Servlet 의 doDispatch() 로 들어간다.
2. doDispatch 에서 컨트롤러의 요청 url 에 해당하는 핸들러 메소드와 인터셉터를 찾는다.
3. 인터셉터들에 대해 preHandle() 을 실행한다. 톰캣은 request body 를 한 번만 읽을 수 있다. preHandle() 에서 body 를 읽으면 컨트롤러에서 body 를 읽지 못해 오류가 생길 수 있다.
4. 핸들러의 파라미터에 요청 데이터를 바인딩 한다. 
   - ServeltRequest 에서 inputMessage 를 가져온다.
   - 헤더에서 content-type 을 읽고 맞는 messageConverter 가 있는지 확인한다.
   - content-type 에서 charset 을 가져와 그 charset 으로 inputMessage 의 body 를 String 으로 옮겨서 리턴한다.
   - @RequestBody 가 파라미터에 추가된 경우 messageConverter 로 body 에서 읽어들인 inputStream 을 컨버팅 한다. 따라서 json, xml 등을 사용한 경우 @RequestBody 를 파라미터에 추가해야 한다.
   - @RequestBody 가 파라미터에 없으면 FormPOST 형식으로 inputStream 을 읽고 RequestBody 에 대한 재사용이 가능하도록 처리한다.
5. 핸들러 메소드에 진입하고 메소드에 작성된 작업을 실행한다.
6. 작업이 끝나면 respojse 를 응답한다. @ResponseBody 를 사용하는 경우 return 하는 내용을 messageConverter 로 컨버팅하고 HttpServeltResponse 에 추가해 응답한다.