---
layout: post
title: spring request handling 2
date: 2022-06-30 06:00:00 + 0900
categories: Spring
ref: Spring, Servlet
---

# 스프링 요청 처리 과정 2

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/176543993-fdaa03fd-3a00-4c70-a996-c25e99b1d14a.png" />
  <figcaption></figcaption>
</figure>

## 1. 핸들러 매핑
Dispatcher Servlet 은 요청을 받으면 어떤 핸들러(컨트롤러) 를 호출할 지    
핸들러 매핑 전략을 통해 결정한다.   
핸들러 매핑 전략은 DI 를 통해 확장할 수 있다.

Dispatcher Servlet 은 핸들러 어댑터를 사용해 어떤 형식의 핸들러든 호출할 수 있다.   
따라서 핸들러 어댑터는 컨트롤러 마다 하나씩 있어야 한다.