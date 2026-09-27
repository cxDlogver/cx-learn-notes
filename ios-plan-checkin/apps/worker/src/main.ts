async function bootstrap(): Promise<void> {
  process.stdout.write("plan-checkin worker ready\n");
}

void bootstrap();
