package com.example.springserver;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class AppControllerTest {

	private final MockMvc mockMvc = MockMvcBuilders
		.standaloneSetup(new AppController(new AppService()))
		.build();

	@Test
	void shouldReturnHelloWorld() throws Exception {
		mockMvc.perform(get("/"))
			.andExpect(status().isOk())
			.andExpect(content().string("Hello World!"));
	}
}
