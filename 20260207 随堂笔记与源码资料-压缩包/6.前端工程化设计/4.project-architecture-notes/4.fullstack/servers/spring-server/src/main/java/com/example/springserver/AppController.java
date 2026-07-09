package com.example.springserver;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AppController {

	private final AppService appService;

	public AppController(AppService appService) {
		this.appService = appService;
	}

	@GetMapping("/")
	public String getHello() {
		return appService.getHello();
	}
}
