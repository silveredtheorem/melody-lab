-- CreateIndex
CREATE INDEX "Branch_projectId_idx" ON "Branch"("projectId");

-- CreateIndex
CREATE INDEX "Commit_projectId_idx" ON "Commit"("projectId");

-- CreateIndex
CREATE INDEX "Commit_authorId_idx" ON "Commit"("authorId");

-- CreateIndex
CREATE INDEX "Commit_parentId_idx" ON "Commit"("parentId");

-- CreateIndex
CREATE INDEX "Layer_commitId_idx" ON "Layer"("commitId");

-- CreateIndex
CREATE INDEX "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");

-- CreateIndex
CREATE INDEX "ProjectMember_userId_idx" ON "ProjectMember"("userId");
