---
layout: post
title: Netflix OSS
date: 2021-09-07 23:30:00 + 0900
categories: Patterns
ref: MSA, zuul, ribbon, eureka, hystrix
---

# Neflix OSS
넷플릭스에서 제공하는 MSA 전환 기술이다.   
API gateway 역할을 하는 zuul, 로드 밸런서 역할의 ribbon, 서킷브레이커 패턴 구현체 hystrix    
그리고 서비스 관리를 위한 eureka 로 구성되어 있다.

## 1. eureka
각 서비스들의 주소 집합이다. 서비스가 100 개 쯤 있다면 100 개의 주소를 모두 관리해 줘야하고,   
서비스가 추가, 제거 되거나 오류로 다운되게 되면 MSA 에 등록된 각각의 서비스는 주소를 관리해 줘야한다.   
eureka 는 서비스가 죽었는지 수시로 확인해 목록을 동적으로 관리해준다.   
각 서비스들은 eureka 에서 정상 작동 중인 서비스 목록을 가져와 요청에 사용한다.

## 2. ribbon
클라이언트 사이드(MSA 에서 다른 서비스를 호출하는 서비스) 에서 동작하는 소프트웨어 로드밸런서이다.   
정해진 서비스 목록으로도 가능하지만, 주로 Eureka 와 연동해 서비스 목록에 맞게 로드밸런싱 해준다.   
그리고 API gateway 에서도 로드밸런싱을 위해 종종 사용한다.   
<figure>
  <img src="https://user-images.githubusercontent.com/13375810/132364769-8c4928d9-99e8-4e7f-8dae-739bfa80b881.png" height="300" />
</figure>

## 3. hystrix
특정 서비스에 문제가 생겨 서비스가 내려가거나 과부하가 걸려 응답이 늦어지게 되면 전체 서비스에 장애가 전파되는 경우가 있다.   
이 때 장애가 확산되지 않도록 차단해 주는 패턴을 서킷 브레이커 패턴이라고 한다.   
서비스에 장애가 생기면 설정된 기준에 따라 hystrix 는 open 상태가 되어 미리 작성된 fallback 으로 응답한다.   
이 후 서비스가 복구되면 closed 상태가 되어 정상화된 서비스에 다시 연결해 준다.   

[서킷 브레이커 패턴 구현](https://github.com/5-SH/design_pattern_java/tree/master/src/circuit_breaker)

## 4. zuul
API gateway 구현체이다. MSA 는 도메인 별로 서비스를 만들기 때문에 클라이언트 입장에서 다수의 엔드포인트가 생긴다.   
API gateway 는 모든 클라이언트 요청에 대한 엔드포인트를 통합하고 프록시 처럼 동작한다.   
zuul 은 클라이언트에서 보내는 다양한 형태의 트래픽과 많은 양의 트래픽으로 문제가 발생하지 않도록 filter 를 통해 대비한다.   
filter 는 요청 라우팅, Rate Limiting, 인증, 모니터링, 부하테스트 기능을 제공한다.

<figure>
  <img src="https://user-images.githubusercontent.com/13375810/132366255-c9c560be-bfc6-483b-902b-dfdcbcaa2f9d.png" height="500" />
  <p style="font-style: italic; color: gray;">출처 – https://medium.com/netflix-techblog/announcing-zuul-edge-service-in-the-cloud-ab3af5be08ee</p>
</figure>