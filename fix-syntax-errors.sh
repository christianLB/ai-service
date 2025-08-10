#!/bin/bash

# Fix common syntax errors in TypeScript files

echo "Fixing syntax errors in TypeScript files..."

# Fix the pattern: _next: NextFunction: Promise<void> => { 
# Should be: _next: NextFunction): Promise<void> => {
find src -name "*.ts" -type f -exec sed -i 's/_next: NextFunction: Promise<void>/_next: NextFunction): Promise<void>/g' {} \;

# Fix the pattern: _next: NextFunction => {
# Should be: _next: NextFunction) => {
find src -name "*.ts" -type f -exec sed -i 's/_next: NextFunction => {/_next: NextFunction) => {/g' {} \;

# Fix the pattern: (_next: any) => {
# Should be: _next: any) => {
find src -name "*.ts" -type f -exec sed -i 's/(_next: any) => {/_next: any) => {/g' {} \;

# Fix the pattern: (_next: NextFunction
# Should be: _next: NextFunction
find src -name "*.ts" -type f -exec sed -i 's/(_next: NextFunction/_next: NextFunction/g' {} \;

# Fix the pattern with wrong parenthesis placement
find src -name "*.ts" -type f -exec sed -i 's/\(req: any, res: any, (_next: any)/\(req: any, res: any, _next: any)/g' {} \;

echo "Syntax errors fixed!"