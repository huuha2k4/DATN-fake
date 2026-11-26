package com.finance.finance.config;

import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Set;

@Configuration
public class FlywayConfig {

    @Bean(initMethod = "migrate")
    @ConditionalOnProperty(prefix = "spring.flyway", name = "enabled", havingValue = "true", matchIfMissing = true)
    public Flyway flyway(
            DataSource dataSource,
            @Value("${spring.flyway.baseline-on-migrate:true}") boolean baselineOnMigrate,
            @Value("${spring.flyway.default-schema:core}") String defaultSchema,
            @Value("${spring.flyway.create-schemas:true}") boolean createSchemas,
            @Value("${spring.flyway.validate-on-migrate:true}") boolean validateOnMigrate
    ) {
        return Flyway.configure()
                .dataSource(dataSource)
                .locations("classpath:db/migration")
                .baselineOnMigrate(baselineOnMigrate)
                .defaultSchema(defaultSchema)
                .createSchemas(createSchemas)
                .validateOnMigrate(validateOnMigrate)
                .load();
    }

    /**
     * Ensures Flyway migrations complete before Hibernate initializes
     * EntityManagerFactory (so ddl-auto=validate always runs against the migrated schema).
     */
    @Bean
    @ConditionalOnProperty(prefix = "spring.flyway", name = "enabled", havingValue = "true", matchIfMissing = true)
    public static BeanFactoryPostProcessor entityManagerFactoryDependsOnFlyway() {
        return beanFactory -> {
            if (beanFactory.containsBeanDefinition("entityManagerFactory")
                    && beanFactory.containsBeanDefinition("flyway")) {
                BeanDefinition emfDef = beanFactory.getBeanDefinition("entityManagerFactory");
                Set<String> deps = new LinkedHashSet<>();
                if (emfDef.getDependsOn() != null) {
                    deps.addAll(Arrays.asList(emfDef.getDependsOn()));
                }
                deps.add("flyway");
                emfDef.setDependsOn(deps.toArray(new String[0]));
            }
        };
    }
}
