import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);

        int n = in.nextInt();
        int m = in.nextInt();
        int c0 = in.nextInt();
        int d0 = in.nextInt();

        int[] dp = new int[n + 1];

        // m 种有馅粽子：多重背包
        for (int i = 0; i < m; i++) {
            int a = in.nextInt();
            int b = in.nextInt();
            int c = in.nextInt();
            int d = in.nextInt();

            // 当前馅料最多可以制作的粽子数量
            int count = a / b;

            // 多重背包，面粉容量倒序
            for (int j = n; j >= 0; j--) {
                for (int k = 1; k <= count && k * c <= j; k++) {
                    dp[j] = Math.max(
                        dp[j],
                        dp[j - k * c] + k * d
                    );
                }
            }
        }

        // 无馅粽子数量无限：完全背包，正序
        for (int j = c0; j <= n; j++) {
            dp[j] = Math.max(
                dp[j],
                dp[j - c0] + d0
            );
        }

        System.out.println(dp[n]);

        in.close();
    }
}