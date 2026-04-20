# Stage 1: Build React frontend
FROM node:22-alpine AS node-build
WORKDIR /app
COPY flowkigai-web/package*.json ./
RUN npm ci
COPY flowkigai-web/ ./
RUN npm run build

# Stage 2: .NET restore + build
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ["src/YearPlanningApp.API/YearPlanningApp.API.csproj", "src/YearPlanningApp.API/"]
COPY ["src/YearPlanningApp.Application/YearPlanningApp.Application.csproj", "src/YearPlanningApp.Application/"]
COPY ["src/YearPlanningApp.Infrastructure/YearPlanningApp.Infrastructure.csproj", "src/YearPlanningApp.Infrastructure/"]
COPY ["src/YearPlanningApp.Domain/YearPlanningApp.Domain.csproj", "src/YearPlanningApp.Domain/"]
COPY ["NuGet.Config", "."]
RUN dotnet restore "src/YearPlanningApp.API/YearPlanningApp.API.csproj"
COPY . .
RUN dotnet build "src/YearPlanningApp.API/YearPlanningApp.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "src/YearPlanningApp.API/YearPlanningApp.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 3: Final runtime image
FROM base AS final
WORKDIR /app
COPY --from=node-build /app/dist ./wwwroot
COPY --from=publish /app/publish .
# Changelog auto-generated before deploy (see docker-compose.prod.yml)
COPY changelog.json ./changelog.json
ENTRYPOINT ["dotnet", "YearPlanningApp.API.dll"]
